# Cloudflare-Setup — deine private Cloud-DB in 4 Schritten

Damit deine Buchungen auf allen Geräten verfügbar sind, betreibst du deinen
**eigenen** kleinen Cloudflare-Worker. Kostenlos (Free-Tier), keine laufenden
Kosten, keine zentrale Datenhaltung. Einmal eingerichtet — danach reicht auf
neuen Geräten URL + Secret (+ optionale Passphrase).

## 1. Cloudflare-Konto anlegen

Kostenloses Konto unter <https://dash.cloudflare.com/sign-up>. E-Mail
bestätigen, 2-Faktor aktivieren empfohlen.

## 2. Worker per Knopfdruck einrichten

Den **„Deploy to Cloudflare"-Button** in der App (Einstellungen → Cloudflare)
oder hier antippen:

<https://deploy.workers.cloudflare.com/?url=https://github.com/einfachmachen/supadupa-money/tree/main/worker-data>

Cloudflare legt nach dem Login den Worker **und** den Speicher (KV) automatisch
an. Am Ende bekommst du eine URL wie `https://mbt-sync.DEIN-NAME.workers.dev`.

## 3. Geheimnis (`SYNC_SECRET`) setzen

In der App auf **„Secret generieren"** tippen (erzeugt ein starkes Passwort) und
kopieren. Dann im Cloudflare-Dashboard:

> Worker `mbt-sync` → **Settings** → **Variables and Secrets** →
> Variable `SYNC_SECRET` als **Secret** hinzufügen → den kopierten Wert einfügen
> → speichern.

Denselben Wert trägst du in der App ins Feld **Secret** ein.

## 4. Verbinden & testen

In der App die `…workers.dev`-URL ins Feld **Worker URL** eintragen und
**„Verbindung testen"** drücken — grüner Haken = fertig. Mit **„Lokal →
Cloudflare"** lädst du deine Daten erstmalig hoch.

## Optional, empfohlen: Verschlüsselung (Passphrase)

Setzt du im Feld **Passphrase** ein Geheimwort, werden deine Daten **vor** dem
Hochladen im Browser verschlüsselt (Zero-Knowledge) — der Worker sieht nur
Chiffrat. Wichtig: **auf jedem Gerät dieselbe Passphrase** eingeben. Geht sie
verloren, sind die Cloud-Daten nicht mehr lesbar.

## Weiteres Gerät hinzufügen

Auf dem neuen Gerät einfach **dieselbe** Worker-URL, **dasselbe** Secret und
(falls genutzt) **dieselbe** Passphrase eintragen, dann **„Cloudflare → Lokal"**.
Kein erneutes Worker-Deployment nötig.
