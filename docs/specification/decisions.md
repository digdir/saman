# Beslutninger

Hvorfor kravspesifikasjonen (`docs/specification/kravspesifikasjon.md`) er endret. Hver endring i
kravspesifikasjonen skal ha en rad her, med krav-ID og begrunnelse.

Nyeste beslutning øverst.

| Dato | Krav-ID | Beslutning | Begrunnelse | Besluttet av |
| --- | --- | --- | --- | --- |
| 2026-10-31 | 4.1, 4.2, åpen avklaring 1 og 7 | Entiteten Medlem/Ansatt heter nå Person, og dekker både ansatte og innleide i én entitet med et flagg for om personen er ansatt, og et flagg for om personen fortsatt jobber i Digdir. Dette avklarer åpen avklaring 1. Lokasjon er presisert som et kontor i en by, med kode og navn fra kilden. Adresse og by er bevisst utelatt inntil videre. Ny åpen avklaring 7: om personens ID i kilden endres når en innleid blir ansatt. | Ansatte og innleide har de samme opplysningene og kommer fra samme kilde, så én entitet er enklest. Flagget for sluttet tar vare på historikken i team når noen slutter. Ingen krav trenger adresse for lokasjon ennå. | Ronny Birkeli |
| 2026-10-25 | FO-01–FO-07, AL-01–AL-04, AI-03, 3.8–3.16 | Folk (3.8) er delt i to: Folk beholder det grunnleggende om ansatte og tilhørighet (FO-01–FO-03), og det nye området Allokering (3.9) har kravene om fordeling av kapasitet. Kravene har fått nye ID-er uten at teksten er endret: FO-04 er nå AL-01, FO-05 AL-02, FO-06 AL-03 og FO-07 AL-04. FO-04–FO-07 brukes ikke om igjen. AI-03 viser nå til AL-04. Områdene etter er nummerert én opp, og «jf. Folk» om allokering viser nå til Allokering. | Allokering er et eget behov med egne personvernhensyn (AL-04, åpen avklaring 3), og kan bygges og vurderes for seg, etter det grunnleggende i Folk. Egne ID-er gjør det tydelig hvilket område kravene hører til. Ingenting var implementert eller viste til de gamle ID-ene ennå. | Ronny Birkeli |
| 2026-10-24 | 4.2 | Den logiske datamodellen er gjort om fra bilde (PNG) til et Mermaid-diagram. Entiteter, relasjoner og kardinaliteter er uendret. | Diagrammet kan nå leses, søkes i og endres som tekst, og endringer vises i diffen. | Ronny Birkeli |
