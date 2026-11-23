/**
 * The cartoon clips of the "Pause vidéos" feed (original animations, drawn by studio.html, rendered by render.cjs).
 *
 * The videos contain pictures and movement only. The words are NOT drawn in the video: the app shows them as
 * captions in the child's language and Pipo says them (so the same clip works in French and English).
 * This file is the single source: render.cjs draws the frames from it and writes public/reels/catalog.json
 * (with the caption "cues": when to show and say each word).
 *
 * Timing: 1.2 s intro, 3.6 s per step, 2.2 s outro.
 */
(function (root) {
  const L = (fr, en) => ({ fr, en });

  const SCENES = [
    {
      id: 'ferme', collection: 'monde', bg: ['#fff3c4', '#d1fae5'], friend: false,
      title: L('Les animaux de la ferme', 'Farm animals'),
      intro: L('Regarde !', 'Look!'),
      outro: L('Bravo !', 'Well done!'),
      steps: [
        { kind: 'pic', pic: '1f404', say: L('la vache', 'the cow'), then: L('Meuh !', 'Moo!') },
        { kind: 'pic', pic: '1f411', say: L('le mouton', 'the sheep'), then: L('Bê !', 'Baa!') },
        { kind: 'pic', pic: '1f414', say: L('la poule', 'the hen'), then: L('Cot cot !', 'Cluck cluck!') },
        { kind: 'pic', pic: '1f416', say: L('le cochon', 'the pig'), then: L('Groin groin !', 'Oink oink!') },
        { kind: 'pic', pic: '1f40e', say: L('le cheval', 'the horse'), then: L('Hi hi hi !', 'Neigh!') },
      ],
      repeat: L('la vache', 'the cow'),
    },
    {
      id: 'compte', collection: 'monde', bg: ['#dbe7ff', '#fde2f0'], friend: false,
      title: L('Compte avec Pipo', 'Count with Pipo'),
      intro: L('On compte !', "Let's count!"),
      outro: L('Bravo !', 'Well done!'),
      steps: [
        { kind: 'count', n: 1, pic: '1f388', say: L('un', 'one'), then: L('un ballon', 'one balloon') },
        { kind: 'count', n: 2, pic: '1f388', say: L('deux', 'two'), then: L('deux ballons', 'two balloons') },
        { kind: 'count', n: 3, pic: '1f388', say: L('trois', 'three'), then: L('trois ballons', 'three balloons') },
        { kind: 'count', n: 4, pic: '1f388', say: L('quatre', 'four'), then: L('quatre ballons', 'four balloons') },
        { kind: 'count', n: 5, pic: '1f388', say: L('cinq', 'five'), then: L('cinq ballons', 'five balloons') },
      ],
      repeat: L('un, deux, trois', 'one, two, three'),
    },
    {
      id: 'couleurs', collection: 'monde', bg: ['#fde2f0', '#fff3c4'], friend: true,
      title: L('Les couleurs', 'Colors'),
      intro: L('Quelle couleur ?', 'What color?'),
      outro: L('Bravo !', 'Well done!'),
      steps: [
        { kind: 'color', color: '#ef4444', pic: '1f34e', say: L('rouge', 'red'), then: L('comme la pomme', 'like the apple') },
        { kind: 'color', color: '#3b82f6', pic: '1f433', say: L('bleu', 'blue'), then: L('comme la baleine', 'like the whale') },
        { kind: 'color', color: '#facc15', pic: '2600', say: L('jaune', 'yellow'), then: L('comme le soleil', 'like the sun') },
        { kind: 'color', color: '#22c55e', pic: '1f333', say: L('vert', 'green'), then: L("comme l'arbre", 'like the tree') },
        { kind: 'color', color: '#ec4899', pic: '1f338', say: L('rose', 'pink'), then: L('comme la fleur', 'like the flower') },
      ],
      repeat: L('rouge', 'red'),
    },
    {
      id: 'bouche', collection: 'sons', bg: ['#ede4ff', '#dbe7ff'], friend: true,
      title: L('Fais comme Pipo', 'Do like Pipo'),
      intro: L('Fais comme moi !', 'Do like me!'),
      outro: L('Bravo !', 'Well done!'),
      steps: [
        { kind: 'act', pic: '1f48b', say: L('Un bisou !', 'A kiss!'), then: L('mouah !', 'mwah!') },
        { kind: 'act', pic: '1f4a8', say: L('Souffle fort !', 'Blow hard!'), then: L('fff !', 'fff!') },
        { kind: 'act', pic: '1f445', say: L('Tire la langue !', 'Stick out your tongue!'), then: L('la la la !', 'la la la!') },
        { kind: 'act', pic: '1f62e', say: L('Ouvre grand la bouche !', 'Open your mouth wide!'), then: L('aaa !', 'aaa!') },
        { kind: 'act', pic: '1f444', say: L('Les lèvres !', 'Your lips!'), then: L('pa pa pa !', 'pa pa pa!') },
      ],
      repeat: L('pa pa pa', 'pa pa pa'),
    },
    {
      id: 'lavage', collection: 'besoins', bg: ['#e0f6ff', '#d1fae5'], friend: false,
      title: L('Je me lave les mains', 'I wash my hands'),
      intro: L('Avant de manger…', 'Before eating…'),
      outro: L('Bravo !', 'Well done!'),
      steps: [
        { kind: 'pic', pic: '1f4a7', say: L("de l'eau", 'water'), then: L('Je mouille mes mains.', 'I wet my hands.') },
        { kind: 'pic', pic: '1f9fc', say: L('du savon', 'soap'), then: L('Je mets du savon.', 'I use soap.') },
        { kind: 'pic', pic: '270b', say: L('les mains', 'my hands'), then: L('Je frotte bien.', 'I rub well.') },
        { kind: 'pic', pic: '1f6bf', say: L('rincer', 'rinse'), then: L('Je rince.', 'I rinse.') },
        { kind: 'pic', pic: '2728', say: L('propres', 'clean'), then: L('Mes mains sont propres !', 'My hands are clean!') },
      ],
      repeat: L('Je me lave les mains.', 'I wash my hands.'),
    },
    {
      id: 'meteo', collection: 'monde', bg: ['#bfe6f5', '#fff3c4'], friend: true,
      title: L('La météo', 'The weather'),
      intro: L('Quel temps fait-il ?', "What's the weather?"),
      outro: L('Bravo !', 'Well done!'),
      steps: [
        { kind: 'pic', pic: '2600', say: L('le soleil', 'the sun'), then: L('Il fait beau !', 'It is sunny!') },
        { kind: 'pic', pic: '2601', say: L('le nuage', 'the cloud'), then: L('Il y a des nuages.', 'There are clouds.') },
        { kind: 'pic', pic: '1f327', say: L('la pluie', 'the rain'), then: L('Il pleut !', 'It is raining!') },
        { kind: 'pic', pic: '1f308', say: L("l'arc-en-ciel", 'the rainbow'), then: L('Oh, un arc-en-ciel !', 'Oh, a rainbow!') },
        { kind: 'pic', pic: '1f4a8', say: L('le vent', 'the wind'), then: L('Il y a du vent.', 'It is windy.') },
      ],
      repeat: L('Il fait beau !', 'It is sunny!'),
    },
    {
      id: 'fruits', collection: 'besoins', bg: ['#fff3c4', '#fde2f0'], friend: false,
      title: L('Les fruits', 'Fruits'),
      intro: L('Miam !', 'Yum!'),
      outro: L('Bravo !', 'Well done!'),
      steps: [
        { kind: 'pic', pic: '1f34c', say: L('la banane', 'the banana'), then: L("C'est bon !", 'It is good!') },
        { kind: 'pic', pic: '1f96d', say: L('la mangue', 'the mango'), then: L('Miam miam !', 'Yum yum!') },
        { kind: 'pic', pic: '1f34d', say: L("l'ananas", 'the pineapple'), then: L("C'est sucré !", 'It is sweet!') },
        { kind: 'pic', pic: '1f34e', say: L('la pomme', 'the apple'), then: L("Croc croc !", 'Crunch crunch!') },
        { kind: 'pic', pic: '1f951', say: L("l'avocat", 'the avocado'), then: L('Un avocat vert.', 'A green avocado.') },
      ],
      repeat: L('la banane', 'the banana'),
    },
    {
      id: 'nuit', collection: 'social', bg: ['#1e1b4b', '#4c1d95'], friend: true, night: true,
      title: L('Bonne nuit', 'Good night'),
      intro: L('Il est tard…', 'It is late…'),
      outro: L('Bonne nuit !', 'Good night!'),
      steps: [
        { kind: 'pic', pic: '1f319', say: L('la lune', 'the moon'), then: L('La lune brille.', 'The moon shines.') },
        { kind: 'pic', pic: '2b50', say: L('les étoiles', 'the stars'), then: L('Les étoiles dorment.', 'The stars are sleeping.') },
        { kind: 'pic', pic: '1f634', say: L('dormir', 'sleep'), then: L('Je dors. Dodo.', 'I sleep. Nighty-night.') },
        { kind: 'pic', pic: '2764', say: L('un câlin', 'a hug'), then: L('Un gros câlin.', 'A big hug.') },
        { kind: 'pic', pic: '1f31f', say: L('à demain', 'see you tomorrow'), then: L('À demain !', 'See you tomorrow!') },
      ],
      repeat: L('Bonne nuit', 'Good night'),
    },
  ];

  const TIMING = { fps: 20, width: 540, height: 960, intro: 1.2, step: 3.6, outro: 2.2 };

  /** Total length of a scene, in seconds. */
  const duration = (s) => TIMING.intro + s.steps.length * TIMING.step + TIMING.outro;

  /** Captions: when to show and say each phrase (relative to the start of the video). */
  function cues(s) {
    const out = [{ t: 0.4, show: s.intro, say: s.intro }];
    s.steps.forEach((st, i) => {
      const t0 = TIMING.intro + i * TIMING.step;
      out.push({ t: +(t0 + 0.4).toFixed(2), show: st.say, say: st.say });
      out.push({ t: +(t0 + 1.9).toFixed(2), show: st.then, say: st.then });
    });
    out.push({ t: +(TIMING.intro + s.steps.length * TIMING.step + 0.3).toFixed(2), show: s.outro, say: s.outro });
    return out;
  }

  const api = { SCENES, TIMING, duration, cues };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.REELS = api;
})(typeof window !== 'undefined' ? window : this);
