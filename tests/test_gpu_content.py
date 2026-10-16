"""Adversarial checks of local content rejection and review boundaries."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('checks', ROOT / 'scripts/content/check-gpu-content.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)


def task(kind='native_example', word='use', pos='noun', language='en', locale=None):
    result = {'entryId': 'entry-1', 'studyLanguage': language, 'task': kind,
              'entry': {'id': 'entry-1', 'word': word, 'partOfSpeech': pos},
              'evidence': {'selectedSense': 'The act of using something.'}}
    if locale:
        result['locale'] = locale
    return result


def codes(result, key='reviewFlags'):
    return {f['code'] for f in result[key]}


def valid_review(t, draft):
    return {'entryId': c.entry_id(t), 'sourceTaskDigest': c.digest(t), 'candidateDigest': c.digest(draft),
            'checks': [{**x, 'status': 'pass', 'reason': 'The selected construction and requested language align with the supplied evidence.'}
                       for x in c.required_review_checks(t, draft)], 'findings': [], 'nativeSpeakerReview': 'pending'}


class ContentChecks(unittest.TestCase):
    def test_recorded_pilot_failure_regressions(self):
        cases = json.loads((ROOT / 'tests/gpu-content-pilot-fixtures.json').read_text())
        for case in cases:
            with self.subTest(case=case['name']):
                result = c.check_content(case['task'], case['draft'])
                if case.get('hardError'):
                    self.assertIn(case['hardError'], codes(result, 'errors'))
                for flag in case.get('flags', []):
                    self.assertIn(flag, codes(result))
                self.assertFalse(result['linguisticApproval'])

    def test_genuine_adverb_comparative_remains_valid(self):
        result = c.check_content(task(word='long', pos='adverb'), {'text': 'We waited longer.', 'focus': {'text': 'longer'}})
        self.assertTrue(result['structuralValid'])
        self.assertNotIn('uninflected_target_missing', codes(result, 'errors'))

    def test_visible_control_token_leakage_is_rejected_without_stripping(self):
        for token in ['<end_of_turn>', '<|im_end|>', '<think>', '</think>', '<eos>', '[INST]']:
            t = task('meaning', word='book', locale='de')
            draft = {'text': 'Ein Buch. ' + token}
            result = c.check_content(t, draft)
            self.assertIn('model_token_leakage', codes(result, 'errors'))
            self.assertFalse(result['structuralValid'])
            self.assertEqual(draft['text'], 'Ein Buch. ' + token)

    def test_mixed_thai_japanese_in_chinese_is_flagged(self):
        t = task('example_translation', locale='zh');t['text'] = 'The discount is ten percent.'
        r = c.check_content(t, {'text': '十เปอร์セント'})
        self.assertIn('foreign_script_dominant', codes(r))
        longer = c.check_content(t, {'text': '这件商品今天购买可以享受十เปอร์セント的优惠折扣，欢迎选购。'})
        self.assertIn('unexpected_script_fragment', codes(longer))
        self.assertFalse(r['linguisticApproval'])

    def test_missing_empty_placeholder_and_changed_id_rejected(self):
        for draft, expected in [({}, 'missing_text'), ({'text': '  '}, 'missing_text'),
                                ({'text': 'TODO', 'focus': {'text': 'TODO'}}, 'placeholder'),
                                ({'id': 'other', 'text': 'After use.', 'focus': {'text': 'use'}}, 'stable_id_changed')]:
            with self.subTest(draft=draft):
                result = c.check_content(task(), draft)
                self.assertFalse(result['structuralValid'])
                self.assertIn(expected, codes(result, 'errors'))
                self.assertFalse(result['linguisticApproval'])

    def test_script_flags_do_not_claim_language_approval(self):
        for language, word, text, flag in [
            ('ja', '図書館', '우리는 내일 도서관에서 만나요.', 'expected_script_absent'),
            ('ko', '도서관', '我們明天在圖書館見面。', 'expected_script_absent'),
            ('zh', '书', 'この図書館では本を読みます。', 'foreign_script_dominant'),
            ('ja', '図書館', '我們明天一起去市立圖書館讀書。', 'han_only_japanese'),
        ]:
            with self.subTest(language=language):
                t = task('meaning', word, language=language, locale=language)
                # Meaning requested locale explicitly set for this script unit check.
                t['explanationLanguages'] = [language]
                result = c.check_content(t, {'text': text})
                self.assertIn(flag, codes(result))
                self.assertFalse(result['linguisticApproval'])

    def test_latin_wrong_target_and_copied_source(self):
        t = task('example_translation', locale='fr');t['text'] = 'The book is on the table with the red cover.'
        r = c.check_content(t, {'text': 'This is the book with your name and we are here.'})
        self.assertIn('possible_wrong_latin_language', codes(r))
        r = c.check_content(t, {'text': t['text']})
        self.assertIn('translation_copies_source', codes(r))

    def test_short_shared_expression_is_not_declared_wrong_language(self):
        t = task('example_translation', locale='fr');t['text'] = 'Taxi!'
        r = c.check_content(t, {'text': 'Taxi !'})
        self.assertNotIn('possible_wrong_latin_language', codes(r))
        self.assertTrue(r['structuralValid'])
        self.assertFalse(r['linguisticApproval'])

    def test_focus_span_uses_javascript_utf16(self):
        t = task(word='book');draft = {'text': '📚 book', 'focus': {'text': 'book', 'start': 3}}
        self.assertTrue(c.check_content(t, draft)['structuralValid'])
        draft['focus']['start'] = 2
        self.assertIn('invalid_focus_span', codes(c.check_content(t, draft), 'errors'))

    def test_repeated_focus_needs_position_and_fragment_needs_review(self):
        r = c.check_content(task(), {'text': 'We use the room for shared use.', 'focus': {'text': 'use'}})
        self.assertIn('invalid_focus_span', codes(r, 'errors'))
        r = c.check_content(task(word='he', pos='pronoun'), {'text': 'The book fell.', 'focus': {'text': 'he', 'start': 1}})
        self.assertIn('embedded_target_surface', codes(r))

    def test_unpaired_surrogates_are_rejected_not_crashed(self):
        r = c.check_content(task(), {'text': 'Bad \ud800 text use', 'focus': {'text': 'use'}})
        self.assertIn('invalid_text_character', codes(r, 'errors'))

    def test_whole_sentence_and_unrelated_focus_not_linguistic_pass(self):
        t = task(word='book')
        self.assertIn('whole_sentence_focus', codes(c.check_content(t, {'text': 'I read books.', 'focus': {'text': 'I read books.'}}), 'errors'))
        r = c.check_content(t, {'text': 'I read books.', 'focus': {'text': 'read'}})
        self.assertTrue(r['structuralValid'])
        self.assertIn('target_surface_requires_review', codes(r))

    def test_explicit_inflection_whitelist_still_requires_semantic_review(self):
        t = task(word='go', pos='verb');t['allowedFocusForms'] = ['went']
        r = c.check_content(t, {'text': 'I went home.', 'focus': {'text': 'went'}})
        self.assertNotIn('target_surface_requires_review', codes(r))
        self.assertEqual(r['nextAction'], 'independent-machine-review')
        self.assertFalse(r['linguisticApproval'])

    def test_exact_focus_does_not_prove_selected_pos(self):
        cases = [('use', 'noun', 'I use the oven.', True),
                 ('use', 'noun', 'Switch it off after use.', False),
                 ('long', 'adverb', 'The road is long.', True),
                 ('long', 'adverb', 'We waited for a long time.', True),
                 ('long', 'adverb', 'We did not wait long.', False),
                 ('same', 'adverb', 'We bought the same present.', True),
                 ('same', 'adverb', 'It works the same.', False),
                 ('first', 'noun', 'The first day was quiet.', True),
                 ('first', 'noun', 'He is the first.', False)]
        for word, pos, sentence, suspect in cases:
            with self.subTest(sentence=sentence):
                r = c.check_content(task(word=word, pos=pos), {'text': sentence, 'focus': {'text': word}})
                self.assertTrue(r['structuralValid'])
                self.assertEqual('possible_target_pos_mismatch' in codes(r), suspect)
                self.assertFalse(r['linguisticApproval'])

    def test_pos_hint_uses_selected_occurrence_not_other_use(self):
        sentence = 'We use the room for shared use.'
        r = c.check_content(task(), {'text': sentence, 'focus': {'text': 'use', 'start': sentence.rindex('use')}})
        self.assertNotIn('possible_target_pos_mismatch', codes(r))

    def test_negation_ability_number_and_time_flags(self):
        t = task('example_translation', locale='fr');t['text'] = 'Yesterday I could not buy two books.'
        r = c.check_content(t, {'text': 'Demain, j’achèterai trois livres.'})
        for code in ['negation_mismatch', 'quantity_mismatch', 'time_anchor_mismatch']:
            self.assertIn(code, codes(r))
        t['text'] = 'I cannot buy books.'
        self.assertIn('ability_negation_check', codes(c.check_content(t, {'text': 'Je n’achète pas de livres.'})))

    def test_number_localisation_is_not_automatic_error(self):
        t = task('example_translation', locale='de');t['text'] = 'It costs 1,200.50 euros.'
        r = c.check_content(t, {'text': 'Es kostet 1.200,50 Euro.'})
        self.assertNotIn('quantity_mismatch', codes(r))
        self.assertTrue(r['structuralValid'])
        t['text'] = 'We need three chairs.';t['locale'] = 'ja'
        self.assertNotIn('quantity_mismatch', codes(c.check_content(t, {'text': '椅子が三個必要です。'})))

    def test_snake_case_field_jobs_and_text_output(self):
        t = {'entryId': 'entry-1', 'task': 'meaning', 'source_language': 'en', 'target_language': 'fr',
             'word': 'book', 'part_of_speech': 'noun'}
        self.assertTrue(c.check_content(t, {'text': 'Un livre.'})['structuralValid'])
        t.update(task='example_translation', text='A book is on the desk.')
        self.assertTrue(c.check_content(t, {'text': 'Un livre est sur le bureau.'})['structuralValid'])

    def test_classifier_object_gloss_is_semantic_flag_not_approval(self):
        t = task('meaning', word='本', pos='classifier', language='zh', locale='ko')
        t['selectedSense'] = {'en': 'A classifier for books.'}
        result = c.check_content(t, {'text': '책'})
        self.assertTrue(result['structuralValid'])
        self.assertIn('classifier_function_missing', codes(result))
        self.assertNotIn('classifier_function_missing', codes(c.check_content(t, {'text': '책을 세는 단위인 권.'})))
        self.assertFalse(result['linguisticApproval'])

    def test_existing_review_task_nested_word_shape(self):
        t = {'id': 'entry-1', 'studyLanguage': 'en', 'word': {'word': 'use', 'partOfSpeech': 'noun'}, 'explanationLanguages': ['fr']}
        d = {'id': 'entry-1', 'meanings': {'fr': 'Utilisation.'}, 'examples': [{'text': 'I use the oven.', 'focus': {'text': 'use'}, 'translations': {'fr': 'J’utilise le four.'}}]}
        r = c.check_content(t, d)
        self.assertTrue(r['structuralValid'])
        self.assertIn('possible_target_pos_mismatch', codes(r))

    def test_circular_english_definition_rejected(self):
        t = task('meaning', word='book', locale='en')
        self.assertIn('circular_native_definition', codes(c.check_content(t, {'text': 'book'}), 'errors'))

    def test_existing_sentence_collision_is_flag_not_automatic_deletion(self):
        draft = {'text': 'After use.', 'focus': {'text': 'use'}}
        r = c.check_content(task(), draft, [{'id': 'other', 'text': 'After use.'}])
        self.assertIn('duplicate_existing_sentence', codes(r))
        r = c.check_content(task(), draft, [{'id': 'entry-1', 'text': 'After use.'}])
        self.assertNotIn('duplicate_existing_sentence', codes(r))

    def test_assembled_missing_maps_and_duplicates_rejected(self):
        t = task('entry');t['explanationLanguages'] = ['en', 'fr']
        e = {'text': 'After use.', 'focus': {'text': 'use'}, 'translations': {'en': 'Changed.', 'fr': 'Après usage.'}}
        d = {'id': 'entry-1', 'meanings': {'en': 'The act of using.'}, 'examples': [e, e]}
        r = c.check_content(t, d)
        for code in ['missing_text', 'duplicate_example', 'native_translation_changed']:
            self.assertIn(code, codes(r, 'errors'))

    def test_unknown_or_empty_requested_languages_are_not_coverage(self):
        for locales in [[], ['xx'], ['fr', 'fr'], {'fr': True}, [['fr']]]:
            with self.subTest(locales=locales):
                t = task('entry');t['explanationLanguages'] = locales
                r = c.check_content(t, {'id': 'entry-1', 'meanings': {}, 'examples': []})
                self.assertIn('invalid_requested_locales', codes(r, 'errors'))
                self.assertFalse(r['structuralValid'])

    def test_generator_approval_never_changes_check_result(self):
        d = {'text': 'After use.', 'focus': {'text': 'use'}, 'review': {'status': 'approved'},
             'qualityStatus': 'native-speaker-approved', 'status': 'complete'}
        r = c.check_content(task(), d)
        self.assertFalse(r['linguisticApproval'])
        request = c.make_review_request(task(), d)
        self.assertNotIn('review', request['data']['draft'])
        self.assertNotIn('qualityStatus', request['data']['draft'])
        self.assertNotIn('status', request['data']['draft'])
        self.assertEqual(request['scope'], 'field-only')


class ReviewBoundary(unittest.TestCase):
    def setUp(self):
        self.t = task()
        self.d = {'text': 'After use.', 'focus': {'text': 'use'}}
        self.r = valid_review(self.t, self.d)

    def validate(self, review=None, **kw):
        return c.validate_review(self.t, self.d, self.r if review is None else review,
                                 author_pass_id='draft-pass', reviewer_pass_id=kw.get('reviewer_pass_id', 'new-review-pass'))

    def test_clean_separate_pass_stays_machine_only(self):
        r = self.validate()
        self.assertTrue(r['reviewValid'])
        self.assertEqual(r['nextAction'], 'retain-machine-reviewed-draft')
        self.assertFalse(r['linguisticApproval'])
        self.assertEqual(r['reviewScope'], 'field-only')

    def test_same_invocation_cannot_approve_itself(self):
        self.assertFalse(self.validate(reviewer_pass_id='draft-pass')['reviewValid'])

    def test_stale_draft_or_task_review_rejected(self):
        self.d['text'] = 'After use, clean it.'
        self.assertFalse(self.validate()['reviewValid'])
        self.r = valid_review(self.t, self.d);self.t['entry']['partOfSpeech'] = 'verb'
        self.assertFalse(self.validate()['reviewValid'])

    def test_bare_verdict_or_missing_locale_checks_cannot_finish_entry(self):
        self.assertFalse(self.validate({'verdict': 'pass', 'issues': []})['reviewValid'])
        self.r['checks'].pop()
        self.assertFalse(self.validate()['reviewValid'])

    def test_native_claim_duplicate_and_malformed_checks_rejected(self):
        for mutation in ['native', 'duplicate', 'type']:
            with self.subTest(mutation=mutation):
                r = copy.deepcopy(self.r)
                if mutation == 'native':r['nativeSpeakerReview'] = 'complete'
                if mutation == 'duplicate':r['checks'].append(r['checks'][0])
                if mutation == 'type':r['checks'][0]['field'] = []
                self.assertFalse(self.validate(r)['reviewValid'])

    def test_uncertain_failed_and_repair_findings_never_complete(self):
        for status in ['uncertain', 'fail']:
            r = copy.deepcopy(self.r);r['checks'][0]['status'] = status
            self.assertEqual(self.validate(r)['nextAction'], 'repair')
        r = copy.deepcopy(self.r);r['findings'] = [{'field': 'draft.text', 'category': 'native-grammar', 'explanation': 'Verb does not agree.', 'proposedReplacement': 'A repair.'}]
        self.assertEqual(self.validate(r)['nextAction'], 'repair')

    def test_false_positive_dismissal_does_not_erase_agent_review_route(self):
        self.d = {'text': 'I use the oven.', 'focus': {'text': 'use'}}
        self.r = valid_review(self.t, self.d)
        r = self.validate()
        self.assertTrue(r['reviewValid'])
        self.assertTrue(r['requiresAgentReview'])
        self.assertEqual(r['nextAction'], 'agent-review')

    def test_assembled_review_requires_all_languages_and_all_examples(self):
        self.t = task('entry', word='book');self.t['explanationLanguages'] = list(c.LANGUAGES)
        self.d = {'id': 'entry-1', 'meanings': {l: 'Definition' for l in c.LANGUAGES},
                  'examples': [{'text': 'A book.', 'focus': {'text': 'book'}, 'translations': {l: 'Translation' for l in c.LANGUAGES}}]}
        expected = c.required_review_checks(self.t, self.d)
        self.assertEqual(len([x for x in expected if x['category'] == 'translation-meaning']), 7)
        self.assertEqual(len([x for x in expected if x['field'].startswith('draft.meanings.')]), 14)
        self.r = valid_review(self.t, self.d)
        self.r['checks'] = [x for x in self.r['checks'] if x['field'] != 'draft.examples[0].translations.zh']
        self.assertFalse(self.validate()['reviewValid'])


class CompactFieldReview(unittest.TestCase):
    def setUp(self):
        self.t = task('meaning', word='book', locale='fr')
        self.d = {'text': 'Un ouvrage écrit.'}
        self.binding = c.make_field_review_request(self.t, self.d)['binding']

    def validate(self, review, binding=None):
        return c.validate_field_review(self.t, self.d, review, binding=self.binding if binding is None else binding,
                                       author_pass_id='author-1', reviewer_pass_id='review-2')

    def test_compact_pass_remains_field_only(self):
        result = self.validate({'verdict': 'pass', 'issues': []})
        self.assertTrue(result['reviewValid'])
        self.assertEqual(result['nextAction'], 'retain-machine-reviewed-field')
        self.assertEqual(result['reviewScope'], 'field-only')
        self.assertFalse(result['linguisticApproval'])

    def test_compact_repair_needs_new_validation_and_review(self):
        result = self.validate({'verdict': 'revise', 'issues': [{'code': 'sense', 'detail': 'Definition does not match the selected sense.'}], 'repair': {'text': 'Un livre.'}})
        self.assertTrue(result['repairRequiresFreshReview'])
        self.assertEqual(result['nextAction'], 'repair')
        self.assertTrue(result['proposedRepairCheck']['structuralValid'])
        self.d['text'] = 'Un livre.'
        self.assertFalse(self.validate({'verdict': 'pass', 'issues': []})['reviewValid'])

    def test_inconsistent_pass_and_missing_binding_rejected(self):
        self.assertFalse(self.validate({'verdict': 'pass', 'issues': ['Wrong sense.']})['reviewValid'])
        self.assertFalse(self.validate({'verdict': 'pass', 'issues': []}, binding={})['reviewValid'])
        self.assertEqual(self.validate({'verdict': 'uncertain', 'issues': []})['nextAction'], 'repair')

    def test_compact_schema_cannot_substitute_full_entry_review(self):
        self.t['task'] = 'entry'
        with self.assertRaises(ValueError):
            c.make_field_review_request(self.t, self.d)
        result = self.validate({'verdict': 'pass', 'issues': []})
        self.assertFalse(result['reviewValid'])


if __name__ == '__main__':
    unittest.main()
