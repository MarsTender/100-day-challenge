/* Exercise & run explanations with simple inline SVG illustrations (no external images). */
(function (root) {
  'use strict';
  var S = 'stroke="#eef2f6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  var G = 'stroke="#8b97a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="5 6"';
  var A = 'stroke="#ffb03d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" marker-end="url(#ah)"';
  var A2 = A + ' marker-start="url(#ah)"';
  function wrap(inner, cap) {
    return '<svg class="illus" viewBox="0 0 240 130" role="img" aria-label="' + cap + '">' +
      '<defs><marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffb03d"/></marker></defs>' +
      inner + '</svg>';
  }
  var FLOOR = '<line x1="8" y1="112" x2="232" y2="112" stroke="#262f3a" stroke-width="4" stroke-linecap="round"/>';
  function head(x, y, ghost) { return '<circle cx="' + x + '" cy="' + y + '" r="9" ' + (ghost ? G : S) + '/>'; }

  var ILLUS = {
    pushups: wrap(FLOOR +
      head(40, 94, true) + '<path d="M50 100 L200 106" ' + G + '/>' +                      // lowered (ghost)
      head(40, 50, false) + '<path d="M50 56 L200 106" ' + S + '/><path d="M62 60 L62 110" ' + S + '/>' + // top: straight arms
      '<path d="M96 52 L96 92" ' + A2 + '/>', 'Push-up: straight body, lower chest to floor, push back up'),

    situps: wrap(FLOOR +
      // lying (ghost)
      head(30, 101, true) + '<path d="M40 104 L110 108 L140 80 L170 110" ' + G + '/>' +
      // sitting up (solid), knees bent, feet flat
      head(92, 48, false) + '<path d="M98 57 L112 108 L148 76 L176 110" ' + S + '/><path d="M100 64 L132 80" ' + S + '/>' +
      '<path d="M44 86 Q58 54 80 46" ' + A + '/>', 'Sit-up: knees bent, curl up from lying to sitting'),

    squats: wrap(FLOOR +
      head(60, 18, true) + '<path d="M60 27 L60 70 L54 110 M60 70 L66 110 M60 36 L60 66" ' + G + '/>' +
      head(160, 44, false) + '<path d="M156 53 L146 82 L176 84 L168 110" ' + S + '/><path d="M154 62 L196 62" ' + S + '/>' +
      '<path d="M90 50 Q112 40 128 56" ' + A + '/>', 'Squat: sit hips back and down, chest up, stand tall'),

    snowangels: wrap(
      // top-down view of person lying face down; arms sweep from hips to overhead
      '<rect x="8" y="8" width="224" height="114" rx="14" fill="#12161b" stroke="#262f3a" stroke-width="2"/>' +
      '<text x="18" y="116" fill="#8b97a6" font-size="11" font-weight="700">TOP VIEW</text>' +
      head(120, 32, false) + '<path d="M120 41 L120 84 M120 84 L106 116 M120 84 L134 116 M106 52 L134 52" ' + S + '/>' +
      '<path d="M106 52 L98 90 M134 52 L142 90" ' + G + '/>' +   // arms at hips (start)
      '<path d="M106 52 L74 14 M134 52 L166 14" ' + S + '/>' +   // arms overhead (end)
      '<path d="M88 94 Q50 66 64 24" ' + A + '/><path d="M152 94 Q190 66 176 24" ' + A + '/>', 'Snow angel: lying face down, sweep straight arms from hips to overhead'),

    dolphinkicks: wrap(FLOOR +
      head(30, 96, false) + '<path d="M40 100 L120 102" ' + S + '/><path d="M44 101 L18 104" ' + S + '/>' +
      '<path d="M120 102 Q150 84 184 92 Q200 96 212 84" ' + S + '/>' +
      '<path d="M120 102 Q150 110 184 104 Q200 100 212 108" ' + G + '/>' +
      '<path d="M226 66 L226 106" ' + A2 + '/>', 'Dolphin kick: legs together, wave-like kick from the hips'),

    supermans: wrap(FLOOR +
      head(50, 76, false) + '<path d="M58 84 Q120 116 170 98 L220 80" ' + S + '/><path d="M62 86 L16 72" ' + S + '/>' +
      '<path d="M20 100 L20 82" ' + A + '/><path d="M228 102 L228 84" ' + A + '/>', 'Superman: lying face down, lift arms, chest and legs, hold, lower'),

    run: wrap(FLOOR +
      head(122, 22, false) + '<path d="M118 31 L108 66 L130 86 L124 110 M108 66 L84 84 L68 80 M116 40 L136 56 L152 48 M116 40 L96 50 L90 66" ' + S + '/>' +
      '<path d="M30 60 L60 60 M20 76 L54 76 M36 92 L62 92" stroke="#3ee07f" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M170 70 L214 70" ' + A + '/>', 'Run: relaxed, upright, quick light steps')
  };

  var INFO = {
    pushups: {
      title: 'Push-ups', muscles: 'Chest, shoulders, triceps, core',
      desc: 'A bodyweight press from a straight-arm plank: lower your chest to the floor and push back up while keeping your body in one straight line.',
      steps: ['Hands on the floor slightly wider than shoulders, fingers forward.', 'Step your feet back into a high plank: head, hips and heels in one line.', 'Bend your elbows (about 45° from your body) and lower until your chest is a fist-height from the floor.', 'Press the floor away to straighten your arms. That is 1 rep.'],
      tips: ['Squeeze glutes and brace your abs so hips don\'t sag or pike.', 'Look slightly ahead of your hands to keep the neck neutral.', 'Too hard for a full set of 10? Do them from your knees or with hands on a bench, and log what you did.']
    },
    situps: {
      title: 'Sit-ups', muscles: 'Abs, hip flexors',
      desc: 'Lying on your back with knees bent, curl your torso all the way up to sitting and lower back down under control.',
      steps: ['Lie on your back, knees bent ~90°, feet flat (tuck them under something if needed).', 'Cross arms over your chest or lightly touch fingertips to your temples.', 'Breathe out and curl up: chin, shoulders, then lower back leave the floor until you are upright.', 'Lower back down slowly, one vertebra at a time. That is 1 rep.'],
      tips: ['Don\'t yank on your neck with your hands.', 'Control the way down; it\'s half the work.', 'Lower back complaining? Switch to crunches (shoulders only) for some sets.']
    },
    squats: {
      title: 'Squats', muscles: 'Quads, glutes, hamstrings, core',
      desc: 'Bodyweight (air) squat: sit your hips back and down as if into a low chair, then drive back up to standing.',
      steps: ['Stand with feet shoulder-width apart, toes turned out slightly.', 'Arms forward for balance, chest up, brace your core.', 'Push hips back and bend knees until thighs are about parallel to the floor (or as deep as you can with good form).', 'Drive through your whole foot to stand up tall, squeezing glutes at the top. That is 1 rep.'],
      tips: ['Knees track in line with your toes; don\'t let them cave in.', 'Keep heels on the floor and weight mid-foot.', 'Keep a neutral spine; don\'t round your lower back at the bottom.']
    },
    snowangels: {
      title: 'Snow angels', muscles: 'Upper back, rear shoulders, rotator cuff, lower back',
      desc: 'The floor (dryland) version used in swimming and fitness training: lie face down and sweep straight arms in a big arc from your hips to overhead and back, like making a snow angel. Great for posture and shoulder health.',
      steps: ['Lie face down, legs straight, forehead hovering just off the floor (or resting on a folded towel).', 'Arms straight by your sides, palms down, thumbs up if comfortable. Lift your hands and arms a few cm off the floor.', 'Keeping arms straight and off the floor, sweep them out to the sides and all the way overhead until your hands meet (or nearly).', 'Sweep back down to your hips. One full there-and-back is 1 rep.'],
      tips: ['Squeeze your shoulder blades together and down; move slowly and smoothly.', 'Keep your neck long; look at the floor, not forward.', 'Too tiring? Lower the arms to the floor between reps.', 'Alternative: do it lying on your back (arms and legs slide on the floor, the classic snow-angel motion), easier on the lower back and good for shoulder mobility.']
    },
    dolphinkicks: {
      title: 'Dolphin kicks', muscles: 'Core, lower back, glutes, hip flexors',
      desc: 'Dryland version of the swimming dolphin (butterfly) kick: with legs pressed together, make a wave-like up-and-down kick that starts at the hips and core and whips through to the feet.',
      steps: ['Lie face down (prone) with arms stretched overhead or hands stacked under your forehead. Legs straight and squeezed together, toes pointed.', 'Lift both legs slightly off the floor together.', 'Kick both legs up and down together in a small, fast wave: hips start the motion, knees bend slightly, feet snap like a fin.', 'Each down-beat (up and down) is 1 rep.'],
      tips: ['Keep legs glued together; think "one big fin".', 'Small, rhythmic movement is better than big swings.', 'Alternative: lie on your back with hands under your hips (lower back pressed down) and do the same undulating kick with legs just off the floor; more ab-focused.', 'In the pool: streamline arms overhead, body underwater, undulate from chest to toes with legs together. Count kicks if you swim them.']
    },
    supermans: {
      title: 'Supermans', muscles: 'Lower back, glutes, upper back, hamstrings',
      desc: 'Lying face down, lift your arms, chest and legs off the floor at the same time like Superman flying, hold briefly, then lower. Replaces snow angels and dolphin kicks from day 31.',
      steps: ['Lie face down, arms stretched overhead, legs straight, toes pointed.', 'Brace your core and squeeze your glutes.', 'Lift arms, chest and legs a few cm off the floor at the same time; only your belly and hips stay down.', 'Hold 1–2 seconds at the top, then lower with control. That is 1 rep.'],
      tips: ['Lift by squeezing glutes and back; don\'t crank your neck. Look at the floor.', 'Height isn\'t the goal; a controlled lift and pause is.', 'Breathe out as you lift, in as you lower.']
    },
    run: {
      title: 'The run', muscles: 'Legs, heart & lungs',
      desc: 'After all reps are done, finish the day with a run: 3 km on days 1–10, 5 km on days 11–20, 10 km on days 21–100. Log the distance you actually ran and, optionally, your time to track your pace.',
      steps: ['Start easy for the first few minutes to warm up.', 'Settle into a pace you could hold a conversation at (most runs should feel "comfortably hard" at most).', 'Finish the target distance, then walk 2–3 minutes to cool down.', 'Log km and time (mm:ss); the app works out your pace per km.'],
      tips: ['Run tall: relaxed shoulders, arms swinging forward and back, not across.', 'Quick, light steps landing under your hips rather than long reaching strides.', 'The jump to 10 km on day 21 is big; slow down and walk breaks are fine.', 'Hydrate, and use the stats tab to watch your pace improve.']
    }
  };
  Object.keys(INFO).forEach(function (k) { INFO[k].svg = ILLUS[k]; });
  root.HDCInfo = INFO;
})(typeof self !== 'undefined' ? self : this);
