# Unit import

How the authoritative source sends Digdir's units (divisions, departments and
sections) to Saman. The design behind it is in
[ADR-0003](../adr/0003-imports-from-the-authoritative-source.md).

> **Status:** proposed, not built yet. The column names are Saman's own for now
> and may change to match the source.

## In short

- Send **all** units every time, as one CSV file, in an HTTP POST.
- Saman checks every row and answers at once: `202` when the file is accepted,
  `400` with every error when it isn't.
- Saman applies an accepted file shortly after, usually within seconds.
- A unit missing from the file is marked as closed in Saman. It is not deleted.

## Request

```
POST https://<saman>/api/enheter/import
Authorization: brukere API-Key <key>
Content-Type: text/csv; charset=utf-8

<the CSV file>
```

- **The key** belongs to Saman's integration user. Keep it on the sending
  server, for example in Windows Credential Manager, never in the script.
- **The body** is the file itself, not a form upload.
- **The file** may be at most 5 MB.

## The file

- UTF-8, with or without a byte order mark.
- The first line is the header. A leading `#TYPE …` line from older versions of
  `Export-Csv` is ignored.
- Comma or semicolon as separator; Saman detects which from the header.
- Values may be quoted, as `Export-Csv` does.
- One unit per line, all units in every file.

### Columns

| Column | Required | Content |
| --- | --- | --- |
| `externalUnitId` | yes | The source's ID for the unit. Unique in the file |
| `name` | yes | The unit's name |
| `code` | no | A short code, such as `SSR` |
| `level` | yes | `Divisjon`, `Avdeling` or `Seksjon` |
| `externalParentId` | no | The `externalUnitId` of the unit above. Empty for divisions |
| `externalLeaderId` | no | The leader's ID, the same ID as in the people file |

Other columns are ignored.

### Example

```csv
"externalUnitId","name","code","level","externalParentId","externalLeaderId"
"100","Samordning, sikkerhet og regelverk","SSR","Divisjon","","4711"
"110","Strategi, råd og prioritering","","Avdeling","100","4712"
"111","Analyse","","Seksjon","110",""
```

### What makes Saman refuse a file

The whole file is refused, and nothing changes, if any row:

- lacks a required column or value
- has a `level` other than `Divisjon`, `Avdeling` or `Seksjon`
- repeats an `externalUnitId` already in the file
- has an `externalParentId` that isn't the `externalUnitId` of another row
- is, through its parents, its own ancestor

A leader ID Saman doesn't know is **not** an error, because the people file may
come later. It is listed in the import's result.

## Responses

**`202 Accepted`**: the file is valid and queued.

```json
{
  "importRunId": 42,
  "rows": 46,
  "statusUrl": "https://<saman>/api/enheter/import/42"
}
```

**`400 Bad Request`**: the file has errors. All of them are listed.

```json
{
  "errors": [
    { "line": 3, "column": "level", "message": "«Team» is not Divisjon, Avdeling or Seksjon" },
    { "line": 7, "column": "externalParentId", "message": "No unit in the file has the ID «999»" }
  ]
}
```

| Status | Meaning |
| --- | --- |
| `401` | The key is missing or wrong |
| `403` | The key belongs to a user that may not import |
| `413` | The file is larger than 5 MB |
| `415` | The body isn't `text/csv` |

### Status of an import

`GET https://<saman>/api/enheter/import/<importRunId>`, with the same
`Authorization` header, returns the run's status: `queued`, `running`,
`succeeded`, `failed` or `superseded` (a newer file arrived before this one
started). A finished run also has its result:

```json
{
  "status": "succeeded",
  "result": {
    "created": 2,
    "updated": 43,
    "deactivated": 1,
    "unknownLeaders": ["4799"]
  }
}
```

Polling is optional. Administrators see the same in Saman's admin panel.

## Example script

Works in Windows PowerShell 5.1 and PowerShell 7.

```powershell
$ErrorActionPreference = 'Stop'

$uri  = 'https://<saman>/api/enheter/import'
$file = 'C:\eksport\enheter.csv'
$key  = $env:SAMAN_API_KEY   # or read it from Windows Credential Manager

# Write the file as UTF-8. Windows PowerShell 5.1 otherwise writes ASCII,
# and æ, ø and å turn into question marks.
$units | Export-Csv -Path $file -NoTypeInformation -Encoding UTF8

try {
    # -InFile sends the file's bytes as they are. A string in -Body can be
    # re-encoded by Windows PowerShell 5.1.
    $result = Invoke-RestMethod -Method Post -Uri $uri `
        -Headers @{ Authorization = "brukere API-Key $key" } `
        -ContentType 'text/csv; charset=utf-8' `
        -InFile $file
    Write-Output "Accepted: import run $($result.importRunId), $($result.rows) units"
}
catch {
    # A 400 response lists every error in the file.
    Write-Error "Saman refused the file: $($_.ErrorDetails.Message)"
    exit 1
}
```
