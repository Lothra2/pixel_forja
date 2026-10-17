"""El plan de hojas SF2: cada movimiento de cada luchador se pide como una hoja de varios cuadros en fila, con la guardia
de Higgsfield como referencia. Así los cuadros salen parejos entre sí (mismo tamaño, misma ropa, misma luz) y el
movimiento tiene sus intermedios de verdad.

    python3 sf2_plan.py            # imprime las peticiones (JSON) en lotes de 12
    python3 sf2_plan.py rick       # solo las de Rick

Cada hoja se guarda en datos/familia/crudo/hojas/<pref>_<hoja>.png y la lee sf2.py.
"""
import json, sys

# la guardia de Higgsfield de cada uno (el job o el archivo subido) y cómo se describe
REF = {
    'rick': '624a950b-348f-4e87-8e04-ba37cb463ae0',
    'sophie': '12be6463-e13c-4519-9ae9-731e2b62b231',
    'alana': '5191cceb-ee20-4dd6-8eb2-4f4a4170555c',
    'steph': 'fc6a70bf-a63b-4c68-b8c1-03de6629710c',
    'thor': 'b7ca83f9-eee1-4de9-85b3-88a12a3e39cb',
    # los jefes del modo arcade (lote G): su diseño de Higgsfield hace de guardia de referencia. Rick pidió jefes
    # nuevos de verdad: la Abuela (jefe final) y Tío Bao
    'abuela': '4e79c8bd-9e72-432c-ba53-4f62a012e183',
    'bao': '699e6240-1c26-4cd3-81b6-59d2893ec160',
    # Rosita, la bisabuela de Rick (jefa final). Su diseño sale de una descripción en texto, sin subir sus fotos
    'rosita': '14790617-21ba-46be-a796-cd9e70132c2f',
    # Andre Panda, jugable (lote I): también desde una descripción en texto
    'andre': '21bbeb0b-daa7-4fe2-9fb5-d560db6f73e7',
}
PREF = {'rick': 'r', 'sophie': 'so', 'alana': 'a', 'steph': 's', 'thor': 't', 'abuela': 'ab', 'bao': 'ba', 'rosita': 'ro', 'andre': 'an'}
DESC = {
    'rick': 'Red sleeveless gi with torn shoulders, black belt, white headband with tails, grey beard, glasses, black fingerless gloves, bandaged ankles, bare feet.',
    'sophie': 'Turquoise short kimono with white collar, pink sash belt, navy leggings, white sneakers with pink soles, ponytail with pink bow.',
    'alana': 'The little princess sorceress: short curly brown hair with a gold tiara, pink jeogori with rainbow striped sleeves, red ribbon bow, long lilac chima skirt with gold trim that always covers the legs, pink shoes, golden star wand. No magic effect drawn.',
    'steph': 'Woman with long black pigtails tipped red and blue, red and black cropped jacket, black and red shorts, fishnet tights, red and black striped socks, black combat boots, fingerless gloves, wooden baseball bat.',
    'thor': 'Fawn boxer dog superhero with black muzzle mask, white chest and paws, red cape, blue domino mask, blue harness with gold lightning bolt, blue leg bands.',
    'abuela': 'Sweet but fearsome Venezuelan grandmother: short fluffy white curly hair, big round glasses, chubby and wide, a long pink house dress with lilac and white flowers covering below the knees, pink rubber flip-flops, always holding one pink flip-flop in her right hand like a weapon.',
    'bao': 'Skinny wiry Vietnamese market merchant: conical non la straw hat, faded brown ao ba ba shirt, wide black trousers rolled up to the knees, rubber sandals, thin mustache, sly grin, always holding a long wooden shoulder pole with a woven fruit basket hanging from each end, used like a fighting staff.',
    'rosita': 'Tiny slender dignified Venezuelan great-grandmother about 85 years old: short soft white-grey hair swept up, cat-eye glasses with thin gold frames and black top rims, small gold hoop earrings, sweet smile, red Christmas knit sweater with a white snowflake pattern, white trousers, red slippers, a small round wooden arepa paddle in one hand.',
    'andre': 'Cheerful chubby young Venezuelan woman with a wide strong body: long loose straight black hair, light tan skin, round face, a headband with little round black panda ears, soft black panda patches around the eyes like a panda mask, burgundy Venezuela national football team jersey with gold stripes on the shoulders and a cream V collar, black shorts, black and white football boots.',
}

# movimientos comunes de los humanos: (hoja, cuadros, título, descripción de los cuadros)
HUMANO = [
    ('guardia', 4, 'IDLE FIGHTING STANCE', 'The fighting stance idle loop with subtle breathing, the four frames almost identical, feet never move. Frame 1: neutral fighting stance, fists up. Frame 2: chest rising slightly. Frame 3: chest at the highest, shoulders up a little. Frame 4: chest lowering'),
    ('avanza', 6, 'WALK FORWARD CYCLE', 'Walking forward in fighting guard with fists up. Frame 1 contact (front heel touching, legs apart), frame 2 down (weight on the front leg, knees bent), frame 3 passing (back leg swinging past, body up), frame 4 contact with the other leg in front, frame 5 down, frame 6 passing'),
    ('retrocede', 6, 'WALK BACKWARD CYCLE', 'Stepping backward cautiously in fighting guard, fists up, torso leaning slightly back, still facing right. Frame 1 back foot reaching back, frame 2 weight shifting back, frame 3 front foot sliding back past, frame 4 feet apart again, frame 5 weight back, frame 6 front foot sliding back'),
    ('agacha', 4, 'CROUCH AND BLOCK', 'Frame 1: half crouch, knees bent, fists up. Frame 2: full low crouch in guard, knees deeply bent, fists up near the face. Frame 3: standing block, forearms crossed in front of the face, torso leaning back, feet planted. Frame 4: crouching block, crouched low with forearms crossed in front of the face'),
    ('salto', 5, 'VERTICAL JUMP', 'Frame 1: crouching to prepare the jump, knees bent. Frame 2: taking off, body stretched upward, arms up. Frame 3: rising in the air with knees tucked up. Frame 4: at the peak, knees tucked, fists up. Frame 5: falling, legs extending down to land'),
    ('salto_adelante', 5, 'FORWARD SOMERSAULT JUMP', 'A forward flip through the air. Frame 1: taking off forward, body leaning forward. Frame 2: curled in a tight ball rotating forward. Frame 3: curled ball upside down mid flip. Frame 4: curled ball finishing the rotation. Frame 5: uncurling, legs extending down to land'),
    ('puno_debil', 4, 'QUICK JAB', 'Frame 1: fighting stance. Frame 2: lead fist starting forward, shoulder turning. Frame 3: lead arm fully extended straight forward at face height, rear fist guarding the chin, feet planted. Frame 4: arm retracting halfway'),
    ('puno_fuerte', 4, 'HEAVY STRAIGHT PUNCH', 'Frame 1: winding up, rear fist pulled back at the hip, torso coiled. Frame 2: torso rotating forward, rear fist driving forward at chest height. Frame 3: rear arm fully extended in a powerful straight punch at head height, hips turned, front knee bent, rear leg straight. Frame 4: recovering, fist pulling back'),
    ('patada_debil', 4, 'QUICK FRONT KICK', 'Frame 1: lifting the front knee up, fists up. Frame 2: snapping the front foot forward. Frame 3: front leg fully extended straight forward at stomach height, standing on one leg, fists up. Frame 4: knee pulling back'),
    ('patada_fuerte', 5, 'HEAVY ROUNDHOUSE KICK', 'Frame 1: pivoting on the front foot, back knee chambering up high. Frame 2: hips turning, leg swinging around. Frame 3: kicking leg fully extended at head height, torso leaning back, standing on one leg. Frame 4: follow-through, leg coming down across the body. Frame 5: landing back in stance'),
    ('agachado_puno', 4, 'CROUCHING PUNCHES', 'Every frame crouched low with knees deeply bent. Frame 1: crouching jab, lead arm extended straight forward at chest height. Frame 2: crouching, arm pulling back. Frame 3: crouching, rear fist pulled back low ready for an uppercut. Frame 4: rising uppercut, rear fist driving straight up above the head, still low on bent legs'),
    ('agachado_patada', 4, 'CROUCHING LOW KICK', 'Frame 1: crouching low in guard, knees deeply bent, fists up. Frame 2: still crouched, front leg starting to slide forward. Frame 3: crouched low, front leg fully extended straight forward along the floor at ankle height, fists up. Frame 4: leg pulling back, still crouched'),
    ('barrida', 5, 'CROUCHING SWEEP', 'A spinning leg sweep low on the floor. Frame 1: crouching, one hand on the floor. Frame 2: spinning low, leg starting to swing. Frame 3: one hand on the floor, the leg fully extended forward sweeping along the floor at ankle height. Frame 4: follow-through, leg swinging past. Frame 5: back to crouching guard'),
    ('aire', 4, 'JUMPING ATTACKS', 'Every frame in the air, no floor. Frame 1: in the air with knees tucked, fist pulled back. Frame 2: in the air punching diagonally down and forward with the arm fully extended. Frame 3: in the air with knees tucked, ready to kick. Frame 4: flying kick in the air, front leg fully extended diagonally down and forward like an arrow, back leg tucked'),
    ('recibe', 4, 'GETTING HIT', 'Frame 1: hit in the face, head snapped back, eyes shut, body bending backward, arms flung out. Frame 2: staggering back, wincing. Frame 3: hit in the stomach, doubled over forward, arms around the belly, eyes shut. Frame 4: staggering, hunched'),
    ('cae', 5, 'KNOCKDOWN', 'Frame 1: knocked off the feet, flying backward in the air, body arched, arms flung out, eyes shut. Frame 2: airborne horizontally, falling backward. Frame 3: hitting the floor with the back, bouncing. Frame 4: flat on the back on the floor, arms out, dazed with swirly eyes. Frame 5: flat on the back on the floor, still'),
    ('levanta', 4, 'GETTING UP', 'Frame 1: on the back on the floor, starting to push up with the arms. Frame 2: sitting up, one knee bent. Frame 3: on one knee, pushing up. Frame 4: back on the feet in fighting stance'),
    ('mareado', 3, 'DIZZY STUN', 'Dazed and wobbling on the spot, swirly eyes, arms hanging loose, knees wobbly. Frame 1: leaning left. Frame 2: upright swaying. Frame 3: leaning right. No stars drawn'),
]

# lo propio de cada uno: los golpes donde un humano usaría el puño o el pie, y sus poderes, victoria e intro
PROPIO = {
    'rick': [
        ('poder1', 5, 'ENERGY WAVE SPECIAL MOVE', 'Frame 1: both hands cupped together at the hip, charging, knees bent. Frame 2: deeper charge, torso twisted back. Frame 3: thrusting both open palms forward together at chest height, arms fully extended, front knee bent. Frame 4: holding the palms forward. Frame 5: recovering to stance. No energy drawn'),
        ('poder2', 5, 'SHOULDER RUSH SPECIAL MOVE', 'Frame 1: lowering the stance, shoulder forward, ready to dash. Frame 2: dashing forward low, shoulder leading, fists tucked. Frame 3: full shoulder charge, body almost horizontal, legs running. Frame 4: impact pose, shoulder fully forward. Frame 5: skidding to a stop'),
        ('poder3', 5, 'SUPER ENERGY WAVE', 'Frame 1: wide stance, both fists clenched at the sides, powering up, shouting. Frame 2: both hands cupped at the hip, muscles tense, headband tails flying. Frame 3: deeper charge, torso twisted far back. Frame 4: thrusting both open palms forward with all his strength, arms locked, wide stance, shouting. Frame 5: holding the thrust. No energy drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: standing relaxed, adjusting his glasses with one hand. Frame 2: crossing the arms over the chest, proud smile. Frame 3: raising one fist high to the sky, triumphant. Frame 4: fist high, laughing'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: standing, both hands tightening the headband behind the head. Frame 2: punching the open palm, cracking the knuckles. Frame 3: rolling the shoulders. Frame 4: dropping into the fighting stance'),
    ],
    'sophie': [
        ('poder1', 5, 'LEAF STORM SPECIAL MOVE', 'A nature magic attack. Frame 1: spinning her hands in a circle at the side, gathering power. Frame 2: both hands together at the hip, ponytail flying up. Frame 3: thrusting both open palms forward, arms fully extended, front knee bent. Frame 4: holding the palms forward. Frame 5: recovering to stance. No leaves or magic drawn'),
        ('poder2', 5, 'HUNDRED KICKS SPECIAL MOVE', 'Standing on one leg firing very fast kicks with the other leg. Frame 1: knee raised. Frame 2: kicking leg extended high at head height. Frame 3: kicking leg extended straight at stomach height. Frame 4: kicking leg extended at chest height. Frame 5: kicking leg extended low. Fists up in every frame'),
        ('poder3', 5, 'JUNGLE FURY SUPER MOVE', 'A big nature magic super attack. Frame 1: crouching with both palms on the floor, summoning. Frame 2: rising up with both arms raised high above the head, ponytail flying. Frame 3: arms spread wide, eyes shining with determination. Frame 4: thrusting both open palms forward with all her strength, wide stance. Frame 5: holding the thrust. No vines, leaves or magic drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: jumping happily with one fist in the air. Frame 2: landing with a big smile. Frame 3: making a peace sign with one hand, winking. Frame 4: peace sign, giggling'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: bowing politely with hands at the sides, martial arts bow. Frame 2: straightening up from the bow. Frame 3: stretching one leg up high. Frame 4: dropping into the fighting stance'),
    ],
    'alana': [
        ('puno_debil', 4, 'WAND TAP', 'Frame 1: stance holding the star wand. Frame 2: drawing the wand back. Frame 3: tapping forward with the star wand at chest height, arm extended. Frame 4: pulling the wand back'),
        ('puno_fuerte', 4, 'BIG WAND SWING', 'Frame 1: raising the star wand high behind the head with both hands. Frame 2: swinging the wand forward and down. Frame 3: wand fully extended forward at head height after the big swing, leaning forward. Frame 4: recovering'),
        ('patada_debil', 4, 'LITTLE STOMP KICK', 'Frame 1: lifting one pink shoe a little under the long skirt. Frame 2: kicking the pink shoe forward low, the skirt still covering the legs. Frame 3: foot extended forward at knee height, arms out for balance, wand in hand. Frame 4: foot back down'),
        ('patada_fuerte', 5, 'TWIRL KICK', 'Frame 1: starting to twirl, skirt flaring like a bell. Frame 2: back turned mid twirl. Frame 3: finishing the twirl with a pink shoe kicking forward at stomach height, the bell skirt still covering the legs. Frame 4: foot coming back. Frame 5: back in stance'),
        ('agachado_puno', 4, 'CROUCHING WAND ATTACKS', 'Every frame crouched low with the skirt pooled on the floor. Frame 1: crouching, tapping forward with the star wand low. Frame 2: crouching, wand pulled back. Frame 3: crouching, wand held low ready to swing up. Frame 4: swinging the star wand straight up above the head, still crouched'),
        ('agachado_patada', 4, 'CROUCHING SHOE KICK', 'Frame 1: crouching low, skirt pooled on the floor. Frame 2: still crouched, sliding one pink shoe forward out from under the skirt. Frame 3: crouched, pink shoe extended forward along the floor at ankle height. Frame 4: foot pulling back'),
        ('barrida', 5, 'CROUCHING SPIN SWEEP', 'A low spinning sweep. Frame 1: crouching, one hand on the floor. Frame 2: spinning low, skirt fanning out on the floor. Frame 3: crouched low, the star wand swept forward along the floor at ankle height. Frame 4: follow-through. Frame 5: back to crouching'),
        ('aire', 4, 'JUMPING ATTACKS', 'Every frame in the air, no floor, skirt puffed out like a bell. Frame 1: in the air holding the wand back. Frame 2: in the air striking down and forward with the star wand fully extended. Frame 3: in the air with knees tucked under the skirt. Frame 4: in the air with both pink shoes kicking forward and down under the bell skirt'),
        ('poder1', 5, 'MAGIC STAR SPELL', 'Frame 1: raising the star wand up with both hands, eyes closed, concentrating. Frame 2: wand spinning above the head. Frame 3: pointing the star wand straight forward with the arm fully extended, the other hand on the hip. Frame 4: holding the pointing pose. Frame 5: recovering. No magic drawn'),
        ('poder2', 5, 'PRINCESS SPIN', 'A royal pirouette attack, wand held out. Frame 1: twirling, facing right, skirt flaring. Frame 2: twirling, facing the viewer. Frame 3: twirling, back turned. Frame 4: twirling, facing the viewer again. Frame 5: finishing the twirl facing right with the wand held out'),
        ('poder3', 5, 'STAR CROWN SUPER SPELL', 'Frame 1: holding the star wand high with both hands, eyes closed. Frame 2: floating slightly off the ground, arms raised high, tiara shining, skirt flowing. Frame 3: floating, spreading both arms wide. Frame 4: pointing the star wand forward with all her power, floating. Frame 5: landing softly. No magic drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: twirling the star wand happily. Frame 2: holding the skirt and making a princess curtsy. Frame 3: raising the wand to the sky with a big smile. Frame 4: blowing a kiss'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: adjusting her gold tiara with both hands. Frame 2: spinning the star wand in her fingers. Frame 3: waving cheerfully. Frame 4: wand pointed forward in her fighting stance'),
    ],
    'steph': [
        ('puno_fuerte', 4, 'BASEBALL BAT SWING', 'Frame 1: bat cocked back over the shoulder with both hands, coiled. Frame 2: swinging the bat forward. Frame 3: bat fully extended forward horizontally at head height after a powerful swing, hips turned. Frame 4: follow-through, bat across the body'),
        ('agachado_puno', 4, 'CROUCHING BAT ATTACKS', 'Every frame crouched low with knees deeply bent. Frame 1: crouching, quick jab with the bat handle forward. Frame 2: crouching, bat pulled back. Frame 3: crouching, bat held low behind ready to swing up. Frame 4: swinging the bat straight up in a rising uppercut above the head'),
        ('aire', 4, 'JUMPING ATTACKS', 'Every frame in the air, no floor. Frame 1: in the air with the bat raised overhead. Frame 2: in the air smashing the bat down and forward, arms fully extended. Frame 3: in the air with knees tucked. Frame 4: flying kick in the air, combat boot extended diagonally down and forward'),
        ('poder1', 5, 'HOME RUN SPECIAL MOVE', 'Frame 1: tossing a baseball up with one hand, bat in the other. Frame 2: gripping the bat with both hands, cocked back like a batter. Frame 3: swinging hard. Frame 4: bat fully extended forward at chest height, the moment of the hit. Frame 5: follow-through with a wink. No ball or effects drawn'),
        ('poder2', 5, 'CRAZY CARTWHEEL KICK', 'An acrobatic flip attack. Frame 1: diving forward onto one hand. Frame 2: upside down on one hand, legs split in the air. Frame 3: cartwheeling, boots kicking forward. Frame 4: flipping upright, one boot kicking forward high. Frame 5: landing in stance'),
        ('poder3', 5, 'BAT TORNADO SUPER MOVE', 'Spinning with the bat held straight out with both hands like a helicopter. Frame 1: facing right, bat extended forward. Frame 2: facing the viewer, bat extended to the side. Frame 3: back turned, bat extended back. Frame 4: facing the viewer again. Frame 5: finishing the spin facing right with a big swing'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: resting the bat on both shoulders behind the neck, grinning. Frame 2: laughing with the head thrown back. Frame 3: blowing a kiss. Frame 4: pointing the bat forward with a wink'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: tapping the bat in her open palm. Frame 2: twirling the bat. Frame 3: swinging the bat to the shoulder with a cheeky smile. Frame 4: fighting stance'),
    ],
    # Andre Panda: la más pesada de la familia, golpes de panda y de fútbol (la tijera es una chilena)
    'andre': [
        ('salto', 5, 'HEAVY JUMP', 'A lower, heavy jump. Frame 1: crouching to prepare, knees bent. Frame 2: taking off, arms up. Frame 3: in the air, knees tucked. Frame 4: at the peak, knees tucked, fists up. Frame 5: landing heavily, knees bent'),
        ('puno_debil', 4, 'PANDA SWAT', 'Frame 1: fighting stance. Frame 2: lead hand pulling back with fingers curled like a paw. Frame 3: quick open-paw swat forward at face height, arm extended. Frame 4: arm retracting'),
        ('puno_fuerte', 4, 'TWO-HANDED PANDA CLAW', 'Frame 1: both hands raised high like big panda paws, fingers curled, playful growl. Frame 2: swinging both paws forward and down. Frame 3: both arms fully extended forward clawing at chest height, leaning forward. Frame 4: recovering'),
        ('patada_debil', 4, 'SHORT PASS KICK', 'A short football pass with the inside of the foot. Frame 1: stepping, kicking leg drawn back. Frame 2: swinging the leg forward, foot turned sideways. Frame 3: inside of the boot striking forward at shin height, leg extended, arms out for balance. Frame 4: leg coming back'),
        ('patada_fuerte', 5, 'BICYCLE KICK', 'A spectacular football bicycle kick (chilena). Frame 1: jumping up and leaning back. Frame 2: body almost horizontal in the air, one leg swinging up. Frame 3: upside down in the air, kicking leg fully extended up and forward over her head, the other leg down. Frame 4: falling back, landing on the hands. Frame 5: back on her feet in stance. No ball drawn'),
        ('agachado_puno', 4, 'CROUCHING PANDA SWATS', 'Every frame crouched low with knees bent. Frame 1: crouching, quick paw swat forward at knee height. Frame 2: pulling back. Frame 3: crouching, paw pulled back low. Frame 4: rising uppercut paw swipe straight up above the head, still low on bent legs'),
        ('agachado_patada', 4, 'CROUCHING TOE POKE', 'Frame 1: crouching low in guard. Frame 2: still crouched, front foot sliding forward. Frame 3: crouched low, poking forward with the toe of the boot along the floor at ankle height. Frame 4: foot pulling back, still crouched'),
        ('barrida', 5, 'SLIDING TACKLE', 'A football sliding tackle. Frame 1: running low. Frame 2: dropping to the floor sliding on one hip. Frame 3: sliding along the floor, front leg fully extended forward at ankle height, one hand on the floor. Frame 4: sliding to a stop. Frame 5: getting up to crouching guard'),
        ('aire', 4, 'AIR SWAT AND VOLLEY', 'Every frame in the air, no floor. Frame 1: in the air with knees tucked, paw pulled back. Frame 2: in the air swatting diagonally down and forward with the arm extended. Frame 3: in the air with knees tucked, ready to kick. Frame 4: flying volley kick in the air, front leg fully extended diagonally down and forward'),
        ('poder1', 5, 'BALL KICK SPECIAL MOVE', 'Frame 1: a football at her feet, stepping back. Frame 2: running up to the ball, kicking leg drawn back high. Frame 3: kicking hard, kicking leg fully extended forward at shin height, the ball already gone, arms out. Frame 4: follow-through, leg up. Frame 5: back in stance, fist pump. Only in frames 1 and 2 the ball is drawn on the floor'),
        ('poder2', 5, 'GIANT SCISSORS SPECIAL MOVE', 'Holding a pair of giant shiny silver scissors as long as her body with both hands, blades pointing forward. Frame 1: scissors held up, blades open wide. Frame 2: lunging forward, blades snapping closed. Frame 3: blades open again, stepping forward. Frame 4: blades snapping closed, lunging. Frame 5: scissors open, determined grin'),
        ('poder3', 5, 'GOAL BICYCLE KICK SUPER MOVE', 'Frame 1: tossing a football up with the knee. Frame 2: jumping very high and leaning back. Frame 3: upside down in the air, kicking leg fully extended up and forward, a powerful bicycle kick. Frame 4: falling back to the floor, arms out. Frame 5: on one knee shouting goal with both fists up. No ball, fire or effects drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: shouting GOL with both arms wide open, running pose. Frame 2: sliding on her knees celebrating, fists up. Frame 3: kissing the badge on her jersey. Frame 4: making a funny panda face with both hands like paws, laughing'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: juggling a football on her knee. Frame 2: catching the ball under her foot. Frame 3: adjusting the panda ears headband, playful wink. Frame 4: dropping into a wide heavy fighting stance'),
        ('carrera', 4, 'PANDA ROLL', 'Rolling forward fast curled up in a tight ball like a panda, every frame clearly rotated further. Frame 1: curled ball, head at the top. Frame 2: curled ball rotated a quarter turn forward. Frame 3: curled ball upside down. Frame 4: curled ball rotated three quarters'),
        ('techo_zinc', 4, 'ZINC SHEET OVER THE HEAD', 'Walking forward holding a big rusty corrugated zinc roof sheet flat over her head with both hands, arms raised, like a shield or umbrella. Frame 1: left foot forward. Frame 2: passing. Frame 3: right foot forward. Frame 4: passing. The zinc sheet is long, wavy and rusty red-brown'),
    ],
    'thor': [
        ('guardia', 4, 'IDLE FIGHTING STANCE', 'The ready stance idle loop on four legs, head up, alert, panting with the tongue out, the four frames almost identical, paws never move. Frame 1: neutral. Frame 2: chest rising. Frame 3: chest highest, cape lifting a little. Frame 4: chest lowering'),
        ('avanza', 6, 'TROT FORWARD CYCLE', 'Trotting forward on four legs, head up, cape flowing. Six frames of a natural dog trot cycle with diagonal leg pairs moving together'),
        ('retrocede', 6, 'BACKING UP CYCLE', 'Backing up cautiously on four legs while still facing right, head low, growling, cape hanging. Six frames of stepping backward'),
        ('agacha', 4, 'CROUCH AND BLOCK', 'Frame 1: lowering the body, front legs bending. Frame 2: crouched low to the ground, growling, ready to pounce. Frame 3: standing block, body braced and leaning back, cape wrapped in front like a shield. Frame 4: crouched low block, cape wrapped in front'),
        ('salto', 5, 'JUMP', 'Frame 1: crouching to jump. Frame 2: leaping up, front legs reaching up, cape flowing down. Frame 3: in the air with legs tucked. Frame 4: at the peak, legs tucked, ears flapping. Frame 5: falling, legs extending down to land'),
        ('salto_adelante', 5, 'FORWARD FLIP JUMP', 'A forward flip through the air. Frame 1: leaping forward. Frame 2: curled in a ball rotating forward, cape wrapped around. Frame 3: curled ball upside down. Frame 4: curled ball finishing the rotation. Frame 5: uncurling, legs extending to land'),
        ('puno_debil', 4, 'QUICK PAW SWIPE', 'Frame 1: standing on all fours. Frame 2: raising one front paw. Frame 3: swiping the front paw forward fast at head height, claws out. Frame 4: paw coming back down'),
        ('puno_fuerte', 4, 'REARING CLAW SLAM', 'Frame 1: rearing up on the hind legs, both front paws raised high, claws out. Frame 2: standing tall on the hind legs. Frame 3: slamming both front paws forward and down, body lunging forward. Frame 4: landing on all fours'),
        ('patada_debil', 4, 'QUICK BITE', 'Frame 1: head pulled back, mouth closed. Frame 2: lunging the head forward, mouth opening. Frame 3: snapping bite forward at head height, neck stretched, jaws wide. Frame 4: pulling back'),
        ('patada_fuerte', 5, 'BUCKING HIND KICK', 'Frame 1: lowering the head and front body. Frame 2: front paws planted, hind legs lifting. Frame 3: both hind legs kicking out powerfully, body almost vertical upside down on the front paws, but still facing right with the head forward and the hind legs kicking forward over the head. Frame 4: hind legs coming down. Frame 5: back on all fours'),
        ('agachado_puno', 4, 'LOW PAW ATTACKS', 'Every frame crouched low to the ground. Frame 1: low quick paw swipe forward at ankle height. Frame 2: paw pulled back, crouched. Frame 3: crouched, ready to spring. Frame 4: springing up with a rising headbutt straight up'),
        ('agachado_patada', 4, 'LOW ANKLE BITE', 'Frame 1: crouched low. Frame 2: stretching the neck forward low. Frame 3: biting forward at ankle height, body low and long. Frame 4: pulling back'),
        ('barrida', 5, 'SLIDING TACKLE', 'Frame 1: running low. Frame 2: diving forward low. Frame 3: sliding forward on the belly along the floor, front legs stretched forward. Frame 4: still sliding. Frame 5: getting back on all fours'),
        ('aire', 4, 'JUMPING ATTACKS', 'Every frame in the air, no floor. Frame 1: in the air, front paw raised. Frame 2: in the air swiping the front paw down and forward, claws out. Frame 3: in the air, curled. Frame 4: in the air diving head first forward and down like a missile, front legs forward'),
        ('recibe', 4, 'GETTING HIT', 'Frame 1: hit in the face, head snapped back, eyes shut, yelping. Frame 2: staggering back. Frame 3: hit in the belly, body curled, eyes shut. Frame 4: staggering'),
        ('cae', 5, 'KNOCKDOWN', 'Frame 1: knocked off the feet, flying backward, legs flailing, eyes shut. Frame 2: airborne upside down, falling backward. Frame 3: hitting the floor on the back, bouncing. Frame 4: on the back with the paws up, dazed with swirly eyes, tongue out. Frame 5: on the side on the floor, still'),
        ('levanta', 4, 'GETTING UP', 'Frame 1: on the side on the floor, lifting the head. Frame 2: rolling onto the belly. Frame 3: pushing up on the front legs. Frame 4: back on all fours, shaking it off'),
        ('mareado', 3, 'DIZZY STUN', 'Dazed and wobbling on four legs, swirly eyes, tongue out. Frame 1: leaning left. Frame 2: swaying. Frame 3: leaning right. No stars drawn'),
        ('poder1', 5, 'SUPER BARK SPECIAL MOVE', 'Frame 1: planting all four paws, inhaling, chest puffed. Frame 2: head pulled back, mouth closed, cape flaring. Frame 3: barking with the mouth wide open, head thrust forward, ears blown back. Frame 4: still barking hard. Frame 5: closing the mouth. No sound effects drawn'),
        ('poder2', 5, 'LIGHTNING DASH SPECIAL MOVE', 'Frame 1: crouched low, ready to sprint. Frame 2: launching forward in a full sprint, body stretched. Frame 3: full speed gallop, legs fully stretched, cape straight back. Frame 4: headbutt impact, head forward, legs tucked. Frame 5: skidding to a stop. No lightning drawn'),
        ('poder3', 5, 'THUNDER HOWL SUPER MOVE', 'Frame 1: sitting back, head lowered, gathering power. Frame 2: standing tall, head raised. Frame 3: howling at the sky with the head thrown back, cape flying up. Frame 4: still howling with all his power. Frame 5: lowering the head, fierce. No lightning drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: sitting proudly, chest out, cape flowing. Frame 2: tongue out, happy panting. Frame 3: howling happily. Frame 4: wagging, paw raised'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: shaking the whole body like after a bath, cape flapping. Frame 2: standing tall, cape settling. Frame 3: a short bark. Frame 4: lowering into the fighting stance'),
    ],
}

# lote G: los dos jefes legendarios del modo arcade
JEFES = {
    'abuela': [
        ('poder1', 5, 'FLIP-FLOP THROW SPECIAL MOVE', 'Frame 1: winding up, the flip-flop raised high behind her head. Frame 2: leaning back, angry face. Frame 3: throwing the flip-flop forward hard with the arm fully extended, hand now empty. Frame 4: follow-through, pointing forward. Frame 5: taking a new flip-flop off her foot, back in stance'),
        ('poder2', 5, 'COME HERE GRAB SPECIAL MOVE', 'Frame 1: stepping forward, free hand reaching. Frame 2: arm fully stretched forward, fingers pinching something invisible at ear height, stern face. Frame 3: pulling back hard, leaning back. Frame 4: still pulling, wagging the flip-flop with the other hand. Frame 5: back in stance. Only the grandmother drawn'),
        ('poder3', 5, 'FLIP-FLOP STORM SUPER MOVE', 'Frame 1: crouching, gathering power, glasses shining. Frame 2: both arms raised throwing several flip-flops up to the sky. Frame 3: arms high, shouting. Frame 4: pointing at the enemy with one finger, furious. Frame 5: hands on hips, satisfied. No falling flip-flops drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: hands on hips, proud. Frame 2: wagging a finger, scolding. Frame 3: fanning herself with the flip-flop, smiling. Frame 4: laughing warmly with the flip-flop raised'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: adjusting her glasses. Frame 2: taking off one flip-flop from her foot. Frame 3: slapping the flip-flop on her open palm. Frame 4: fighting stance with the flip-flop raised'),
    ],
    'bao': [
        ('poder1', 5, 'HAT BOOMERANG SPECIAL MOVE', 'Frame 1: taking the conical hat off his head with one hand, the pole on the shoulder. Frame 2: winding the hat back. Frame 3: throwing the hat forward spinning like a frisbee, arm fully extended, head now bare. Frame 4: follow-through. Frame 5: catching the hat back and putting it on'),
        ('poder2', 5, 'POLE SPIN SPECIAL MOVE', 'Frame 1: gripping the shoulder pole with both hands, baskets swinging. Frame 2: spinning the pole forward like a staff, baskets flying out. Frame 3: dashing forward with the pole fully extended horizontally in front, baskets swinging. Frame 4: second spin. Frame 5: stopping with the pole back on the shoulder'),
        ('poder3', 5, 'MANGO RAIN SUPER MOVE', 'Frame 1: crouching, gripping the pole. Frame 2: flinging both baskets up to the sky with the pole. Frame 3: arms raised, the empty pole held up high, laughing. Frame 4: pointing at the enemy. Frame 5: pole back on the shoulder, sly grin. No falling fruit drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: biting into a mango, grinning. Frame 2: tipping his hat. Frame 3: counting money with a sly smile. Frame 4: pole on the shoulder, laughing'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: walking in with the pole and baskets on the shoulder. Frame 2: putting the baskets down. Frame 3: twirling the pole. Frame 4: fighting stance with the pole'),
    ],
    # Rosita: golpes de abuela de verdad (pellizco, paletazo, pisotón con la pantufla, barrido con la escoba) y un salto
    # cortico, nada de volteretas
    'rosita': [
        ('salto', 5, 'SHORT HOP', 'A small careful hop, not high. Frame 1: bending the knees a little. Frame 2: hopping up a little, arms out for balance. Frame 3: at the top of the small hop, feet together. Frame 4: coming down. Frame 5: landing softly, knees bent'),
        ('salto_adelante', 5, 'SHORT FORWARD HOP', 'A small careful hop forward, not a flip. Frame 1: leaning forward, knees bent. Frame 2: hopping forward, arms out for balance. Frame 3: in the air moving forward, feet together. Frame 4: coming down forward. Frame 5: landing softly'),
        ('puno_debil', 4, 'AFFECTIONATE PINCH', 'Frame 1: stance. Frame 2: free hand reaching forward. Frame 3: arm extended forward at cheek height pinching with two fingers, loving smile. Frame 4: pulling the hand back'),
        ('puno_fuerte', 4, 'PADDLE SMACK', 'Frame 1: raising the wooden arepa paddle high behind her head. Frame 2: swinging the paddle forward and down. Frame 3: paddle fully extended forward at head height after a big smack, leaning forward. Frame 4: recovering'),
        ('patada_debil', 4, 'SLIPPER STOMP', 'Frame 1: lifting one knee a little. Frame 2: foot up in the slipper. Frame 3: stomping the slipper down hard on the floor in front of her. Frame 4: back in stance'),
        ('patada_fuerte', 5, 'BROOM SWEEP', 'Frame 1: grabbing a straw broom with both hands, held back. Frame 2: swinging the broom forward low. Frame 3: broom fully extended forward sweeping along the floor at ankle height, leaning forward. Frame 4: follow-through. Frame 5: back in stance with the broom gone'),
        ('agachado_puno', 4, 'CROUCHING PADDLE HITS', 'Every frame crouched low with knees bent. Frame 1: crouching, poking forward with the paddle at knee height. Frame 2: pulling back. Frame 3: crouching, paddle pulled back low. Frame 4: rising paddle swing upward above the head, still low on bent legs'),
        ('agachado_patada', 4, 'CROUCHING SLIPPER KICK', 'Frame 1: crouching low in guard. Frame 2: still crouched, one foot sliding forward. Frame 3: crouched low, the slipper foot extended straight forward along the floor at ankle height. Frame 4: foot pulling back, still crouched'),
        ('barrida', 5, 'LOW BROOM SWEEP', 'Frame 1: crouching low holding a straw broom. Frame 2: swinging the broom low. Frame 3: crouched, broom fully extended forward sweeping the floor at ankle height. Frame 4: follow-through. Frame 5: back to crouching guard'),
        ('aire', 4, 'HOP ATTACKS', 'Every frame in the air, a small hop. Frame 1: in the air, paddle raised. Frame 2: in the air smacking diagonally down and forward with the paddle. Frame 3: in the air, knees together. Frame 4: in the air kicking diagonally down and forward with the slipper foot'),
        ('poder1', 5, 'FLYING AREPA THROW SPECIAL MOVE', 'Frame 1: picking up a big round arepa from the paddle with the free hand. Frame 2: winding up, the arepa held back behind her. Frame 3: throwing the arepa forward hard, arm fully extended, hand now empty. Frame 4: follow-through, pointing forward with the paddle. Frame 5: back in stance. No flying arepa drawn'),
        ('poder2', 5, 'HAVE YOU EATEN COUNTER STANCE', 'A calm counter stance. Frame 1: stepping back, open palm starting forward. Frame 2: open palm extended forward at chest height like saying stop, the other hand holding the paddle back, wise calm face. Frame 3: same pose, eyes narrowed, ready. Frame 4: quick counter smack forward with the paddle. Frame 5: back in stance'),
        ('poder3', 5, 'COME EAT FAMILY SUPER MOVE', 'Frame 1: taking out a small brass kitchen bell. Frame 2: raising the bell high above her head. Frame 3: ringing the bell hard, mouth wide open shouting. Frame 4: both arms raised, bell high, shouting with all her strength, glasses shining. Frame 5: hands on hips, satisfied smile. No effects drawn'),
        ('victoria', 4, 'VICTORY POSE', 'Frame 1: adjusting her gold glasses with a sweet smile. Frame 2: offering a plate with a warm arepa. Frame 3: hand on the heart, laughing warmly. Frame 4: waving goodbye kindly'),
        ('intro', 4, 'ROUND INTRO', 'Frame 1: walking in calmly, wiping her hands on a kitchen towel. Frame 2: folding the towel over her shoulder. Frame 3: picking up the wooden arepa paddle, tapping it on her palm. Frame 4: fighting stance with the paddle'),
    ],
}

# lote F (lo que pidió el juego en su lote E): carrera, agarre y agarrado para los cinco, y el trote de Thor de
# verdad (sus 6 cuadros de avanza eran casi iguales y patinaba)
LOTE_F_HUMANO = [
    ('carrera', 4, 'RUN FORWARD CYCLE', 'Running fast forward in a low fighting dash, body leaning forward, fists up. Frame 1: right leg pushing off, left knee high. Frame 2: both feet off the ground, legs apart. Frame 3: left leg pushing off, right knee high. Frame 4: both feet off the ground, legs apart'),
    ('carrera_atras', 3, 'BACK DASH', 'A quick hop backward while still facing right, guard up. Frame 1: crouching slightly, pushing off. Frame 2: in the air hopping backward, knees bent, leaning back. Frame 3: landing on the toes in the fighting stance'),
    ('agarre', 4, 'GRAB AND THROW', 'A wrestling throw of an invisible opponent, only this character drawn. Frame 1: reaching forward with both hands to grab. Frame 2: holding the collar of the invisible opponent with both hands, arms bent, pulling close. Frame 3: twisting the hips and swinging both arms up and over the shoulder to throw. Frame 4: follow-through after the throw, arms down behind, looking back'),
    ('agarrado', 2, 'BEING GRABBED', 'Being grabbed by the collar by an invisible opponent in front, only this character drawn. Frame 1: pulled forward off balance, surprised, arms flailing, on tiptoes. Frame 2: lifted slightly off the ground, struggling, eyes shut'),
]
LOTE_F_THOR = [
    ('trote', 8, 'DOG TROT CYCLE', 'A real dog trot cycle on four legs moving forward, head up, cape flowing back, every frame clearly different. Diagonal leg pairs move together: front left with back right, then front right with back left. Frame 1: front left and back right legs reaching forward, the other pair pushing back. Frame 2: first pair landing. Frame 3: legs passing under the body. Frame 4: first pair pushing back, second pair swinging forward. Frame 5: front right and back left legs reaching forward. Frame 6: second pair landing. Frame 7: legs passing under the body. Frame 8: second pair pushing back, first pair swinging forward'),
    ('trote_atras', 6, 'BACKING UP CYCLE', 'Backing up step by step on four legs while still facing right, head low, growling, cape hanging, every frame clearly different with diagonal leg pairs: front left with back right stepping back, then front right with back left stepping back. Frame 1: first pair lifting. Frame 2: first pair stepping back. Frame 3: first pair landing. Frame 4: second pair lifting. Frame 5: second pair stepping back. Frame 6: second pair landing'),
    ('carrera', 4, 'DOG GALLOP CYCLE', 'Full speed gallop forward, body stretched, ears back, cape straight back. Frame 1: all legs gathered under the body. Frame 2: front legs reaching far forward, hind legs pushing. Frame 3: fully stretched in the air, no paws touching. Frame 4: front paws landing, hind legs swinging forward'),
    ('carrera_atras', 3, 'BACK HOP', 'A quick hop backward while still facing right, head up. Frame 1: crouching on the hind legs. Frame 2: in the air hopping backward. Frame 3: landing on all fours ready'),
    ('agarre', 4, 'GRAB AND TOSS', 'Grabbing an invisible opponent with the jaws by the sleeve and tossing them, only the dog drawn. Frame 1: lunging forward, jaws open. Frame 2: jaws clamped on something invisible, pulling back, growling. Frame 3: swinging the head hard up and over to the side to toss. Frame 4: follow-through, head turned back, tail up'),
    ('agarrado', 2, 'BEING GRABBED', 'Being grabbed by the scruff and lifted by an invisible opponent in front, only the dog drawn. Frame 1: front paws lifted off the ground, surprised, ears up. Frame 2: dangling, paws flailing, eyes shut'),
]

# qué hojas comunes se salta cada uno porque ya las tiene propias o ya existen
YA_HECHAS = {'rick': {'puno_debil'}, 'sophie': {'avanza', 'agachado_patada'}}


# los efectos: proyectiles de los poderes, chispas, polvo y mareo, sobre negro puro (se recortan por brillo)
EFECTOS = [
    ('fx_onda', 'a glowing blue and white energy ball with a flame-like trailing tail, flying to the right, the flames flickering from frame to frame'),
    ('fx_super_onda', 'a huge glowing blue and white energy wave orb with crackling lightning around it and a long fiery trail, flying to the right, pulsing from frame to frame'),
    ('fx_hojas', 'a swirling tornado ball of bright green leaves and small pink petals flying to the right, spinning from frame to frame'),
    ('fx_chancla', 'a pink rubber flip-flop sandal spinning end over end through the air to the right, with small motion streaks'),
    ('fx_non_la', 'a conical Vietnamese straw hat spinning flat like a frisbee flying to the right'),
    ('fx_balon', 'a football (soccer ball) with rainbow colored panels spinning while flying to the right, with small white motion streaks'),
    ('fx_balon_fuego', 'a football (soccer ball) wrapped in roaring orange and yellow flames with a burgundy and gold trail, flying to the right'),
    ('fx_arepa', 'a big round golden Venezuelan arepa, toasted with dark griddle marks, spinning while flying to the right, with white puffs of hot steam trailing behind it and a faint warm golden glow'),
    ('fx_selva', 'a huge wave of thorny green vines, big blooming pink and yellow flowers and leaves bursting forward to the right, growing from frame to frame'),
    ('fx_estrella', 'a spinning golden magic star with pink sparkles and a short rainbow trail flying to the right, rotating from frame to frame'),
    ('fx_corona', 'a giant shining golden comet star shaped like a crown with a long rainbow trail and sparkles flying to the right, pulsing from frame to frame'),
    ('fx_pelota', 'a flaming baseball with a fire trail flying to the right, spinning from frame to frame'),
    ('fx_ladrido', 'a sonic shockwave of curved cyan energy rings expanding and flying to the right, like a powerful bark, growing from frame to frame'),
    ('fx_trueno', 'a huge rolling wave of yellow and white lightning bolts and electric energy flying to the right, crackling from frame to frame'),
    ('fx_golpe', 'a fighting game hit spark impact burst: frame 1 small bright white and yellow star burst, frame 2 big spiky burst with orange edges, frame 3 burst breaking into rays, frame 4 fading sparks'),
    ('fx_bloqueo', 'a fighting game block spark: frame 1 small bright cyan and white flash, frame 2 big cyan shield-like burst, frame 3 breaking into blue sparks, frame 4 fading sparks'),
    ('fx_polvo', 'a dust cloud puff from a landing or a fall: frame 1 small grey-beige puff on the floor, frame 2 bigger puff spreading to both sides, frame 3 wide thin cloud, frame 4 fading wisps'),
    ('fx_mareo', 'dizzy stars and little birds circling in a ring seen slightly from above, the ring rotating from frame to frame, yellow stars'),
]


def efectos():
    return [{'nombre': n, 'params': {
        'model': 'gpt_image_2_5', 'aspect_ratio': '21:9', 'resolution': '2k', 'quality': 'medium',
        'prompt': (f'Sprite sheet of a visual effect animation for a Street Fighter 2 arcade fighting game: {d}. 4 frames in a '
                   'single horizontal row, evenly spaced, each frame the same size, frames clearly separated with empty space '
                   'between them. Premium 16-bit pixel art, crisp hard-edged pixels, limited SNES palette, bright saturated '
                   'colors, no anti-aliasing, no blur. Plain flat solid pure black background (#000000), no characters, no '
                   'text, no frame borders.')}} for n, d in EFECTOS]


def hojas(pid):
    propias = {h[0]: h for h in PROPIO.get(pid, []) + JEFES.get(pid, [])}
    base = [] if pid == 'thor' else HUMANO
    out = [propias.pop(h[0], h) for h in base]
    # los jefes no llevan carrera ni agarre: el juego usa su respaldo y se ahorran créditos. Una propia con el nombre
    # de una del lote F la reemplaza (la carrera de Andre es rodar como pelota de panda)
    lote_f = [] if pid in JEFES else LOTE_F_THOR if pid == 'thor' else LOTE_F_HUMANO
    lote_f = [propias.pop(h[0], h) for h in lote_f]
    out += list(propias.values()) + lote_f
    return [h for h in out if h[0] not in YA_HECHAS.get(pid, set())]


def prompt(pid, n, titulo, cuadros):
    pies = 'bottoms on the same baseline' if n not in ('aire', 'salto', 'salto_adelante', 'carrera_atras') else 'all frames the same scale'
    return (f'Sprite sheet of a {titulo} animation for a Street Fighter 2 arcade fighting game, same exact character as the '
            f'reference image, same 16-bit pixel art style, same palette, same pixel size. {cuadros_n(n, pid)} frames in a single '
            f'horizontal row, evenly spaced, all the same size and scale, {pies}, every frame side view facing right. {cuadros}. '
            f'{DESC[pid]} Plain flat solid blue background (#3a5e94), no shadow, no ground line, no motion lines, no impact '
            'effects, no text, no frame borders, frames clearly separated with empty space between them, each full body visible.')


def cuadros_n(n, pid):
    for h in hojas(pid):
        if h[0] == n:
            return h[1]


def peticiones(pids):
    out = []
    for pid in pids:
        for n, k, titulo, cuadros in hojas(pid):
            out.append({'nombre': f'{PREF[pid]}_{n}', 'params': {
                'model': 'gpt_image_2_5', 'aspect_ratio': '21:9', 'resolution': '2k', 'quality': 'medium',
                'medias': [{'value': REF[pid], 'role': 'image_references'}], 'prompt': prompt(pid, n, titulo, cuadros)}})
    return out


if __name__ == '__main__':
    p = peticiones(sys.argv[1:] or list(REF)) + ([] if sys.argv[1:] else efectos())
    for i in range(0, len(p), 12):
        lote = [{'index': i + j, 'params': x['params']} for j, x in enumerate(p[i:i + 12])]
        json.dump({'nombres': [x['nombre'] for x in p[i:i + 12]], 'requests': lote}, open(f'/tmp/claude-0/-home-user/b2cbf309-8bef-5741-8f72-309ff11064a8/scratchpad/noche/lote_{i // 12:02d}.json', 'w'), ensure_ascii=False)
    print(len(p), 'hojas', [x['nombre'] for x in p])
