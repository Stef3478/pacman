# Pac-Man

Een complete Pac-Man in de browser: puur HTML, CSS en JavaScript, zonder
build-stap, zonder afhankelijkheden en zonder externe bestanden. Open
`index.html` en je speelt.

Online te spelen via GitHub Pages: <https://stef3478.github.io/pacman/>
(Instellingen → Pages → *Deploy from a branch* → `main` / `(root)`.)

## Spelen

- **Toetsenbord:** pijltjestoetsen of `WASD`
- **Telefoon/tablet:** vegen over het veegveld onder het bord (of over het
  bord zelf). Eén doorlopende beweging mag meerdere bochten geven: veeg in
  een L-vorm en de volgende afslag staat alvast klaar.
- **`P`** of `Esc` pauzeert, **`M`** zet het geluid uit, `Enter`/spatie start

## Op de Apple TV (AirPlay)

Apple TV heeft geen browser, maar via schermsynchronisatie speelt het prima:
de TV toont het spel, je duim veegt blind op de telefoon.

1. Zet iPhone/iPad en Apple TV op hetzelfde wifi-netwerk.
2. Open het spel — het mooist via **Deel → Zet op beginscherm**: het icoon op
   je beginscherm opent dan zonder browserbalken, beeldvullend.
3. Open het Bedieningspaneel en kies **Schermsynchronisatie** → je Apple TV.
4. Draai de telefoon **liggend**: het bord staat dan links op volledige
   hoogte en het veegveld rechts, zodat het TV-beeld vrijwel gevuld is.
5. Kijk naar de TV en stuur met vegen. Het scherm blijft tijdens het spelen
   automatisch wakker, dus de spiegeling valt niet weg.

## Wat er in zit

- Het klassieke doolhof van 28 x 31 tegels met 292 pillen, vier power-pillen
  en een tunnel die links en rechts op elkaar aansluit.
- **Vier spoken met hun eigen karakter**, net als in het origineel:
  - *Blinky* (rood) jaagt recht op Pac-Man af en wordt sneller als er nog
    weinig pillen over zijn.
  - *Pinky* (roze) mikt vier tegels vóór Pac-Man om hem klem te zetten.
  - *Inky* (blauw) bepaalt zijn doel via de lijn tussen Blinky en Pac-Man.
  - *Clyde* (oranje) achtervolgt, maar druipt af zodra hij dichtbij komt.
- Afwisselende **scatter- en chase-fases**: de spoken laten je met tussen-
  pozen even met rust en draaien dan om.
- **Power-pillen** maken de spoken bang; opeten levert 200, 400, 800 en
  1600 punten op. Hun ogen zweven terug naar het huis en komen weer tot leven.
- **Fruit** verschijnt na 70 en 170 pillen, met per level een andere soort
  en waarde (kers 100 t/m sleutel 5000).
- **Levels** die oplopen: de spoken worden sneller en de bange-fase korter.
- Drie levens, een extra leven bij 10.000 punten, en een record dat lokaal
  bewaard blijft.
- Geluid via de Web Audio API (geen audiobestanden), aan/uit te zetten.

## Zelf draaien

Dubbelklikken op `index.html` is genoeg. Wil je het via een servertje:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Opbouw

| Bestand | Wat het doet |
| --- | --- |
| `index.html` | Pagina, HUD en overlay-schermen |
| `style.css` | Neon-arcade-uiterlijk, responsive, touchknoppen |
| `js/maze.js` | Het doolhof als tekst plus het tekenen ervan |
| `js/entities.js` | Pac-Man en de spoken: bewegen, richting kiezen, tekenen |
| `js/audio.js` | Geluidjes uit oscillatoren |
| `js/game.js` | Spelregels: eten, botsingen, levens, levels, punten |
| `js/main.js` | Invoer, HUD-updates en de speellus (vaste stap van 1/60 s) |

Het doolhof staat als leesbare tekst in `js/maze.js`; een level aanpassen
is een kwestie van tekens veranderen (`#` muur, `.` pil, `o` power-pil,
`-` deur van het spookhuis).
