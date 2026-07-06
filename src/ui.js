const PANELS = {
  veienhit: {
    title: 'Veien hit',
    html: `
      <p><b>Norges vei mot VM-finalen 2026</b> — flaggene i vannet er de beseirede:</p>
      <div class="card"><b>🏟 Gruppe I</b><br/>
        Norge – Irak <b>4–1</b> ✅<br/>
        Norge – Senegal <b>3–2</b> ✅<br/>
        Frankrike – Norge <b>4–1</b> ❌ <i>(revansjen kan komme i finalen …)</i><br/>
        → 2. plass i gruppa</div>
      <div class="card"><b>⚔ 32-delsfinale</b><br/>Norge – Elfenbenskysten <b>2–1</b> ✅</div>
      <div class="card"><b>⚔ Åttedelsfinale</b><br/>Norge – Brasil <b>2–1</b> ✅<br/>
        Haaland-dobbel på MetLife — femgangersmesterne sendt hjem, og Neymar la opp etterpå!</div>
      <p class="rune-sep">ᛏ ᛏ ᛏ</p>
      <p><i>Neste stopp: England. Seil til målarenaen i sør og øv på avslutningene.</i></p>`,
  },
  england: {
    title: 'Neste: England',
    html: `
      <p><b>⚔ KVARTFINALE</b></p>
      <div class="card"><b>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Norge – England</b><br/>
        Lørdag 11. juli · Hard Rock Stadium, Miami<br/>
        kl. 17.00 lokal tid (23.00 norsk tid)</div>
      <p>England slo Mexico 3–2 i åttedelsfinalen — etter både rødt kort og
      høydesjokk på Azteca. Norge slo Brasil. Fordel: oss.</p>
      <p>Vinneren møter vinneren av Kansas City-kvartfinalen
      (Argentina/Egypt mot Sveits/Colombia) i semifinalen i Atlanta.</p>
      <p class="rune-sep">ᚺ ᚺ ᚺ</p>
      <p><i>Øv deg her og nå: dytt fotballen forbi England-skipet og inn i
      målet. Måltavla står øverst på skjermen. 🎯</i></p>`,
  },
  gull: {
    title: 'Veien til gull',
    html: `
      <p><b>🏆 Slik ser løypa ut fra kvartfinalen:</b></p>
      <div class="card"><b>Semifinale · Atlanta</b> (Mercedes-Benz Stadium), onsdag 15. juli<br/>
        Mulige motstandere: <b>Argentina, Egypt, Sveits eller Colombia</b><br/>
        <i>(avgjøres i åttedels- og kvartfinalene i disse dager)</i></div>
      <div class="card"><b>FINALEN · MetLife Stadium, New Jersey</b>, søndag 19. juli<br/>
        Fra den andre halvdelen kommer én av:
        <b>Frankrike, Marokko, Portugal, Spania, USA eller Belgia</b><br/>
        <i>(Marokko–Frankrike spilles i Boston 9. juli;
        Portugal/Spania mot USA/Belgia i Los Angeles 10. juli)</i></div>
      <p>Altså: slå England, så er det bare to kamper igjen til gullet du ser
      glitre på steinen her.</p>
      <p class="rune-sep">ᚷ ᚢ ᛚ ᛚ</p>
      <p><i>HEIA NORGE!</i></p>`,
  },
  troppen: {
    title: 'Troppen',
    html: `
      <p><b>Landslagssjef:</b> Ståle Solbakken · <b>Kaptein:</b> Martin Ødegaard</p>
      <div class="card"><b>🧤 Keepere</b><br/>
        Ørjan Nyland · Egil Selvik · Sander Tangvik</div>
      <div class="card"><b>🛡 Forsvar</b><br/>
        Kristoffer Ajer · Torbjørn Heggem · Leo Skiri Østigård · Julian Ryerson ·
        Marcus Holmgren Pedersen · David Møller Wolfe · Fredrik Bjørkan ·
        Sondre Langås · Henrik Falchener</div>
      <div class="card"><b>⚙ Midtbane</b><br/>
        Martin Ødegaard (C) · Sander Berge · Fredrik Aursnes · Patrick Berg ·
        Kristian Thorstvedt · Antonio Nusa · Oscar Bobb · Andreas Schjelderup ·
        Jens Petter Hauge · Thelo Aasgaard · Morten Thorsby</div>
      <div class="card"><b>⚡ Angrep</b><br/>
        Erling Braut Haaland · Alexander Sørloth · Jørgen Strand Larsen</div>
      <div class="card"><b>🎓 Støtteapparatet</b> (utvalg — hele delegasjonen teller 59)<br/>
        Kent Bergersen (assistenttrener) · Brede Hangeland (spilleransvarlig) ·
        Frode Grodås (keepertrener) · Bjørn Vidar Stenersen (fysisk trener) ·
        Pål Fjelde (dødballtrener) · Martin Langagergaard (prestasjonspsykolog) ·
        Andrew Findlay (hovedanalytiker) · Igor Aase (videoanalytiker) ·
        Truls Dæhli (leder for VM-prosjektet) · Are Hokstad (lagsjef) ·
        André Flem (ass. lagsjef/reiseansvarlig)</div>
      <p class="rune-sep">ᚠ ᚢ ᚦ</p>
      <p><i>Troppen ble tatt ut 21. mai — og lest opp av selveste Kong Harald.</i></p>`,
  },
}

export class UI {
  constructor() {
    this.intro = document.getElementById('intro')
    this.hud = document.getElementById('hud')
    this.panel = document.getElementById('panel')
    this.panelTitle = document.getElementById('panelTitle')
    this.panelBody = document.getElementById('panelBody')
    this.speedValue = document.getElementById('speedValue')
    this.scoreEl = document.getElementById('score')
    this.toastEl = document.getElementById('goalToast')
    this.currentPanel = null
    this.onStart = null
    this.onReset = null
    this._toastTimer = null

    document.getElementById('setSail').addEventListener('click', () => this.start())
    document.getElementById('panelClose').addEventListener('click', () => this.closePanel())
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (this.onReset) this.onReset()
    })
  }

  start() {
    this.intro.classList.add('fading')
    setTimeout(() => this.intro.classList.add('hidden'), 900)
    this.hud.classList.remove('hidden')
    if (this.onStart) this.onStart()
  }

  hideIntroImmediately() {
    this.intro.classList.add('hidden')
    this.hud.classList.remove('hidden')
  }

  openPanel(key) {
    const data = PANELS[key]
    if (!data || this.currentPanel === key) return
    this.currentPanel = key
    this.panelTitle.textContent = data.title
    this.panelBody.innerHTML = data.html
    this.panel.classList.remove('hidden')
  }

  closePanel() {
    this.currentPanel = null
    this.panel.classList.add('hidden')
  }

  closePanelIf(key) {
    if (this.currentPanel === key) this.closePanel()
  }

  setSpeed(knots) {
    this.speedValue.textContent = String(Math.round(knots))
  }

  goalScored(score) {
    this.scoreEl.textContent = `⚽ ${score}`
    this.toastEl.textContent = score === 1 ? 'MÅÅÅL FOR NORGE!' : `MÅÅÅL! ${score} mot England!`
    this.toastEl.classList.remove('hidden')
    this.toastEl.classList.remove('pop')
    void this.toastEl.offsetWidth // restart the CSS animation
    this.toastEl.classList.add('pop')
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), 2600)
  }
}
