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
}
PREF = {'rick': 'r', 'sophie': 'so', 'alana': 'a', 'steph': 's', 'thor': 't'}
DESC = {
    'rick': 'Red sleeveless gi with torn shoulders, black belt, white headband with tails, grey beard, glasses, black fingerless gloves, bandaged ankles, bare feet.',
    'sophie': 'Turquoise short kimono with white collar, pink sash belt, navy leggings, white sneakers with pink soles, ponytail with pink bow.',
    'alana': 'The little princess sorceress: short curly brown hair with a gold tiara, pink jeogori with rainbow striped sleeves, red ribbon bow, long lilac chima skirt with gold trim that always covers the legs, pink shoes, golden star wand. No magic effect drawn.',
    'steph': 'Woman with long black pigtails tipped red and blue, red and black cropped jacket, black and red shorts, fishnet tights, red and black striped socks, black combat boots, fingerless gloves, wooden baseball bat.',
    'thor': 'Fawn boxer dog superhero with black muzzle mask, white chest and paws, red cape, blue domino mask, blue harness with gold lightning bolt, blue leg bands.',
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

# qué hojas comunes se salta cada uno porque ya las tiene propias o ya existen
YA_HECHAS = {'rick': {'puno_debil'}, 'sophie': {'avanza', 'agachado_patada'}}


# los efectos: proyectiles de los poderes, chispas, polvo y mareo, sobre negro puro (se recortan por brillo)
EFECTOS = [
    ('fx_onda', 'a glowing blue and white energy ball with a flame-like trailing tail, flying to the right, the flames flickering from frame to frame'),
    ('fx_super_onda', 'a huge glowing blue and white energy wave orb with crackling lightning around it and a long fiery trail, flying to the right, pulsing from frame to frame'),
    ('fx_hojas', 'a swirling tornado ball of bright green leaves and small pink petals flying to the right, spinning from frame to frame'),
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
    propias = {h[0]: h for h in PROPIO.get(pid, [])}
    base = [] if pid == 'thor' else HUMANO
    out = [propias.pop(h[0], h) for h in base]
    out += list(propias.values())
    return [h for h in out if h[0] not in YA_HECHAS.get(pid, set())]


def prompt(pid, n, titulo, cuadros):
    pies = 'bottoms on the same baseline' if n not in ('aire', 'salto', 'salto_adelante') else 'all frames the same scale'
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
