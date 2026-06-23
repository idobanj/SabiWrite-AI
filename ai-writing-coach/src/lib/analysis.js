/**
 * JSDoc typedefs for the AI engine contract.
 * @typedef {"subject_verb_agreement"|"tense"|"article"|"preposition"|"word_choice"|"spelling"|"punctuation"|"sentence_structure"|"other"} MistakeType
 *
 * @typedef {Object} Mistake
 * @property {string} [id]
 * @property {MistakeType} type
 * @property {string} wrong_text
 * @property {string} correct_text
 * @property {number} [start_index]
 * @property {number} [end_index]
 * @property {string} explanation
 * @property {string} [tip]
 *
 * @typedef {Object} AnalysisResponse
 * @property {string} corrected_sentence
 * @property {Mistake[]} mistakes
 * @property {string} explanation
 * @property {number} accuracyScore
 * @property {string} focusArea
 *
 * @typedef {Object} UserStats
 * @property {number} total_submissions
 * @property {number} total_mistakes
 * @property {{type: MistakeType, count: number}[]} top_mistake_types
 * @property {number} improvement_trend
 * @property {number} accuracy
 * @property {number} lessons_completed
 *
 * @typedef {Object} HistoryLog
 * @property {string} id
 * @property {string} user_id
 * @property {string} original_text
 * @property {string} corrected_text
 * @property {number} mistake_count
 * @property {number} accuracy_score
 * @property {string|null} focus_area
 * @property {string} created_at
 */

export {};
