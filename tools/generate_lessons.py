"""Generate writing lessons (numbers 0-15, letters A-E) as JSON files.

The lesson JSON files in src/content/lessons/ are the source of truth for the app.
This script only helps authors: it computes stroke points for curves and two-digit
numbers so they don't have to be typed by hand. Re-run after changing a shape:

    python3 tools/generate_lessons.py

Coordinates are normalized: x and y in 0..1, y pointing down. The writing lines are
at y=0.1 (top) and y=0.9 (base). Each stroke is drawn in order; the first point of
each stroke is where the child starts (green numbered dot in the app).
"""
import json
import math
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'lessons')


def arc(cx, cy, rx, ry, a0, a1, n=24):
    """Points along an ellipse arc from angle a0 to a1 (degrees, screen coords: increasing = clockwise)."""
    return [[cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))] for i in range(n + 1)]


# ---------------------------------------------------------------- digit shapes
# Each shape is a list of strokes (lists of points) in the full writing box.
DIGITS = {
    '0': [arc(0.5, 0.5, 0.27, 0.38, -90, -450, 40)],  # start top, counter-clockwise
    '1': [[[0.38, 0.30], [0.55, 0.12], [0.55, 0.88]]],
    '2': [arc(0.5, 0.34, 0.19, 0.19, 200, 340, 12) + [[0.62, 0.55], [0.30, 0.88], [0.72, 0.88]]],
    '3': [arc(0.47, 0.30, 0.18, 0.18, 210, 450, 20) + arc(0.47, 0.69, 0.21, 0.21, 270, 495, 22)[1:]],
    '4': [[[0.55, 0.12], [0.25, 0.62], [0.78, 0.62]], [[0.62, 0.36], [0.62, 0.88]]],
    '5': [[[0.36, 0.12], [0.34, 0.47]] + arc(0.48, 0.65, 0.22, 0.22, 230, 495, 24)[1:], [[0.36, 0.12], [0.72, 0.12]]],
    '6': [[[0.66, 0.13], [0.52, 0.17], [0.38, 0.30], [0.30, 0.46]] + arc(0.5, 0.66, 0.22, 0.22, 180, -180, 32)],
    '7': [[[0.28, 0.12], [0.74, 0.12], [0.42, 0.88]]],
    '8': [[[0.5 - 0.21 * math.sin(2 * t), 0.5 - 0.38 * math.cos(t)]
           for t in (i * 2 * math.pi / 48 for i in range(49))]],
    '9': [arc(0.5, 0.32, 0.19, 0.19, 0, -360, 32) + [[0.68, 0.88]]],
}

LETTERS = {
    'A': [[[0.50, 0.12], [0.25, 0.88]], [[0.50, 0.12], [0.75, 0.88]], [[0.35, 0.60], [0.65, 0.60]]],
    'B': [[[0.32, 0.12], [0.32, 0.88]],
          [[0.32, 0.12], [0.50, 0.12]] + arc(0.50, 0.30, 0.18, 0.18, -90, 90, 16) + [[0.32, 0.48]],
          [[0.32, 0.48], [0.54, 0.48]] + arc(0.54, 0.68, 0.20, 0.20, -90, 90, 16) + [[0.32, 0.88]]],
    'C': [arc(0.52, 0.5, 0.26, 0.38, -40, -320, 32)],
    'D': [[[0.32, 0.12], [0.32, 0.88]],
          [[0.32, 0.12], [0.42, 0.12]] + arc(0.42, 0.5, 0.28, 0.38, -90, 90, 28) + [[0.32, 0.88]]],
    'E': [[[0.33, 0.12], [0.33, 0.88]], [[0.33, 0.12], [0.70, 0.12]], [[0.33, 0.50], [0.62, 0.50]], [[0.33, 0.88], [0.70, 0.88]]],
}


# Lowercase print letters sit between the midline (y=0.46) and the base line (y=0.9);
# b and d reach up to the top line.
SMALL = {
    'a': [arc(0.47, 0.67, 0.19, 0.21, -30, -390, 32), [[0.66, 0.46], [0.66, 0.88]]],
    'b': [[[0.34, 0.12], [0.34, 0.88]], arc(0.53, 0.67, 0.19, 0.21, 200, 520, 32)],
    'c': [arc(0.52, 0.67, 0.19, 0.21, -40, -320, 28)],
    'd': [arc(0.45, 0.67, 0.19, 0.21, -30, -390, 32), [[0.64, 0.12], [0.64, 0.88]]],
    'e': [[[0.33, 0.67], [0.71, 0.67]] + arc(0.52, 0.67, 0.19, 0.21, 0, -310, 28)[1:]],
}

SMALL_GUIDE = {
    'a': ("On fait un petit rond en commençant en haut à droite, puis un petit trait qui descend à droite.",
          'Make a small round starting at the top right, then a short line down on the right.'),
    'b': ("Un grand trait qui descend depuis la ligne du haut, puis un petit ventre en bas.",
          'A tall line down from the top line, then a small belly at the bottom.'),
    'c': ("Comme le C, mais petit : un rond ouvert qui reste entre les deux lignes du bas.",
          'Like the C, but small: an open curve that stays between the two lower lines.'),
    'd': ("D'abord le petit rond, puis un grand trait qui descend depuis la ligne du haut.",
          'First the small round, then a tall line coming down from the top line.'),
    'e': ("Un petit trait couché au milieu, puis on tourne vers le haut et on fait le tour sans fermer.",
          'A short flat line in the middle, then turn up and go around without closing.'),
}


def place(strokes, cx, scale):
    """Scale a shape around the box center and move it horizontally (for two-digit numbers)."""
    return [[[cx + (x - 0.5) * scale, 0.5 + (y - 0.5) * scale] for x, y in s] for s in strokes]


def rounded(strokes):
    return [{'kind': 'polyline', 'points': [[round(x, 3), round(y, 3)] for x, y in s]} for s in strokes]


NUM_FR = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
          'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze']
NUM_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
          'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen']

# How to help, per shape (parent guidance). Two-digit numbers get a generic text.
GUIDE = {
    '3': ('Deux petits ventres : on fait le premier rond, on revient au milieu, puis le deuxième plus grand.',
          'Two little bellies: make the first curve, come back to the middle, then the second, bigger one.'),
    '4': ("D'abord on descend en biais puis on trace le trait couché ; ensuite le grand trait qui descend.",
          'First slide down at a slant, then draw the flat line; then the long line going down.'),
    '5': ("On descend un petit trait, on fait le gros ventre, puis on ajoute le chapeau en haut.",
          'Draw a short line down, make the big belly, then add the hat on top.'),
    '6': ("On part d'en haut, on descend en glissant comme un toboggan, puis on fait la boucle en bas.",
          'Start at the top, slide down like a slide, then make the loop at the bottom.'),
    '7': ('Un trait couché en haut, puis on descend en biais.', 'A flat line on top, then slide down at a slant.'),
    '8': ("On part d'en haut, on fait un S, puis on remonte en croisant au milieu.",
          'Start at the top, make an S, then go back up crossing in the middle.'),
    '9': ("D'abord le rond en haut, puis on descend tout droit.", 'First the round head, then go straight down.'),
    'A': ("Deux grands traits en pente qui se touchent en haut, puis le petit pont au milieu.",
          'Two long slanted lines that meet at the top, then the little bridge in the middle.'),
    'B': ("Un grand trait qui descend, puis deux ventres l'un sous l'autre.",
          'A long line down, then two bellies, one under the other.'),
    'C': ("On part en haut à droite et on fait un grand rond ouvert, sans le fermer.",
          'Start at the top right and make a big open curve, without closing it.'),
    'D': ("Un grand trait qui descend, puis un grand ventre de haut en bas.",
          'A long line down, then one big belly from top to bottom.'),
    'E': ("Un grand trait qui descend, puis trois traits couchés : en haut, au milieu, en bas.",
          'A long line down, then three flat lines: top, middle, bottom.'),
}

FEEDBACK = {
    'success': {'fr': 'Bravo ! Tu as réussi.', 'en': 'Great! You did it.'},
    'retry': {'fr': 'Essayons encore.', 'en': "Let's try again."},
    'uncertain': {'fr': 'Bien. Essayons encore une fois.', 'en': "Good. Let's try once more."},
    'hintStart': {'fr': 'Regarde le point de départ.', 'en': 'Look at the starting dot.'},
    'moveOn': {'fr': 'Bel entraînement ! On continue.', 'en': "Good practice! Let's keep going."},
}


def lesson(id_, order, group, target, strokes, name_fr, name_en, intro_fr, intro_en, guide, midline=False):
    multi = len(strokes) > 1
    demo_fr = 'Commence au point vert. Suis les traits dans l’ordre des numéros.' if multi else 'Commence au point vert. Suis la ligne.'
    demo_en = 'Start at the green dot. Follow the lines in the order of the numbers.' if multi else 'Start at the green dot. Follow the line.'
    return {
        'id': id_, 'version': 1, 'order': order, 'area': 'writing', 'group': group, 'ageRange': [3, 6],
        'target': target,
        'title': ({'fr': f'Écrire {name_fr}', 'en': f'Write {name_en}'} if group == 'letters'
                  else {'fr': f'Écrire {target}', 'en': f'Write {target}'}),
        'objective': {'fr': f"S'entraîner à reconnaître et à écrire {target}.",
                      'en': f'Practice recognizing and writing {target}.'},
        'parentGuide': {'fr': guide[0] + " Faites le geste dans l'air ensemble avant d'écrire.",
                        'en': guide[1] + ' Make the movement in the air together before writing.'},
        **({'guideLines': 'midline'} if midline else {}),
        'strokes': rounded(strokes),
        'activities': [
            {'type': 'intro', 'say': {'fr': intro_fr, 'en': intro_en}},
            {'type': 'demonstration', 'say': {'fr': demo_fr, 'en': demo_en}},
            {'type': 'trace', 'guide': 'strong', 'maxAttempts': 3,
             'say': {'fr': 'À toi. Commence au point vert.', 'en': 'Now you. Start at the green dot.'}},
            {'type': 'free_write', 'guide': 'none', 'maxAttempts': 3,
             'say': {'fr': f'Maintenant, écris {name_fr} tout seul.', 'en': f'Now write {name_en} by yourself.'}},
        ],
        'feedback': FEEDBACK,
        'completion': {'fr': f"Tu t'es entraîné à écrire {name_fr} !", 'en': f'You practiced {name_en}!'},
    }


def write(data):
    path = os.path.join(OUT, f"{data['id']}.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('wrote', os.path.relpath(path))


def main():
    # Numbers 3..15 (0, 1 and 2 were written by hand and are kept as they are)
    for n in range(3, 16):
        s = str(n)
        if len(s) == 1:
            strokes = DIGITS[s]
            guide = GUIDE[s]
        else:  # two digits side by side, each a bit smaller
            strokes = place(DIGITS[s[0]], 0.29, 0.62) + place(DIGITS[s[1]], 0.71, 0.62)
            guide = (f"On écrit d'abord le {s[0]}, puis le {s[1]} juste à côté. {GUIDE.get(s[1], ('', ''))[0]}".strip(),
                     f"First write the {s[0]}, then the {s[1]} right next to it. {GUIDE.get(s[1], ('', ''))[1]}".strip())
        write(lesson(f'writing-number-{n}', n, 'numbers', s, strokes, NUM_FR[n], NUM_EN[n],
                     f'Voici {NUM_FR[n]}.', f'This is {NUM_EN[n]}.', guide))

    for i, ch in enumerate('ABCDE'):
        write(lesson(f'writing-letter-{ch.lower()}', 100 + i, 'letters', ch, LETTERS[ch],
                     f'le {ch} majuscule', f'capital {ch}',
                     f'Voici la lettre {ch} majuscule.', f'This is capital letter {ch}.', GUIDE[ch]))

    for i, ch in enumerate('abcde'):
        write(lesson(f'writing-letter-{ch}-small', 110 + i, 'letters', ch, SMALL[ch],
                     f'le {ch} minuscule', f'small {ch}',
                     f'Voici la lettre {ch} minuscule.', f'This is small letter {ch}.', SMALL_GUIDE[ch], midline=True))


if __name__ == '__main__':
    main()
