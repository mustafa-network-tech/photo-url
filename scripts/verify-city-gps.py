import unittest
import sys
from fractions import Fraction
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path

sys.dont_write_bytecode = True
spec = spec_from_file_location('extract', Path(__file__).with_name('extract-city-gps.py'))
extract = module_from_spec(spec)
spec.loader.exec_module(extract)


class GPSValidation(unittest.TestCase):
    def test_hemispheres_and_rationals(self):
        values = (Fraction(40), Fraction(11), Fraction(22))
        self.assertAlmostEqual(extract.decimal(values, 'N', 90, 'N', 'S'), 40.18944444444444)
        self.assertAlmostEqual(extract.decimal(values, 'S', 90, 'N', 'S'), -40.18944444444444)
        self.assertAlmostEqual(extract.decimal((25, 54, 10), 'W', 180, 'E', 'W'), -25.90277777777778)
        self.assertEqual(extract.decimal((180, 0, 0), 'E', 180, 'E', 'W'), 180)

    def test_invalid_values_are_not_corrected(self):
        for values, ref in [((91, 0, 0), 'N'), ((90, 0, 1), 'N'), ((40, 60, 0), 'N'), ((40, 0, 60), 'N'), ((-40, 0, 0), 'N'), ((float('nan'), 0, 0), 'N'), ((40, 0, 0), ''), ((40, 0), 'N')]:
            with self.subTest(values=values, ref=ref), self.assertRaises(ValueError):
                extract.decimal(values, ref, 90, 'N', 'S')


if __name__ == '__main__':
    unittest.main()
