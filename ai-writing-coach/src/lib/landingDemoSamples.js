export const DEMO_SAMPLES = [
  {
    id: 'proposal',
    label: 'Client proposal',
    draft: 'Thank you for sharing your goals for the new website. The revised plan include a clearer homepage and a simpler contact form. These changes will help visitors find the right service quickly. I can send the first draft on Friday for your review.',
    corrected: 'Thank you for sharing your goals for the new website. The revised plan includes a clearer homepage and a simpler contact form. These changes will help visitors find the right service quickly. I can send the first draft on Friday for your review.',
    mistakes: [
      {
        id: 'proposal-subject-verb',
        wrong: 'The revised plan include',
        correct: 'The revised plan includes',
        rule: 'Subject–verb agreement',
        explanation: '“Plan” is singular, so its verb takes an -s in the present simple: “the plan includes”.',
      },
    ],
    quiz: {
      prompt: 'Which sentence uses the correct verb?',
      options: [
        'The new design make the page easier to read.',
        'The new design makes the page easier to read.',
        'The new design making the page easier to read.',
      ],
      correctIndex: 1,
      explanation: '“Design” is singular, so use “makes” in the present simple.',
    },
  },
  {
    id: 'message',
    label: 'Work message',
    draft: 'Hi Maya, I has attached the updated report for tomorrow’s meeting. Please sends your comments before three this afternoon so I can prepare the final version. The sales figures are on the second page, and the summary is at the end.',
    corrected: 'Hi Maya, I have attached the updated report for tomorrow’s meeting. Please send your comments before three this afternoon so I can prepare the final version. The sales figures are on the second page, and the summary is at the end.',
    mistakes: [
      {
        id: 'message-present-perfect',
        wrong: 'I has attached',
        correct: 'I have attached',
        rule: 'Present perfect',
        explanation: 'Use “have” with “I” in the present perfect: “I have attached”. Use “has” with “he”, “she”, or “it”.',
      },
      {
        id: 'message-request',
        wrong: 'Please sends',
        correct: 'Please send',
        rule: 'Requests and instructions',
        explanation: 'A request beginning with “please” uses the base form of the verb: “please send”.',
      },
    ],
    quiz: {
      prompt: 'Which request is written correctly?',
      options: [
        'Please reviews the figures before the meeting.',
        'Please reviewing the figures before the meeting.',
        'Please review the figures before the meeting.',
      ],
      correctIndex: 2,
      explanation: 'Use the base form “review” after “please” when making a request.',
    },
  },
  {
    id: 'essay',
    label: 'Short essay',
    draft: 'Last term, I begin reading a short article every morning to improve my English. This habit helped me notice unfamiliar words in context and understand how writers connect their ideas. Over time, I became more confident when discussing the articles with my classmates.',
    corrected: 'Last term, I began reading a short article every morning to improve my English. This habit helped me notice unfamiliar words in context and understand how writers connect their ideas. Over time, I became more confident when discussing the articles with my classmates.',
    mistakes: [
      {
        id: 'essay-past-tense',
        wrong: 'I begin reading',
        correct: 'I began reading',
        rule: 'Past simple',
        explanation: '“Last term” places the action in the past. The past simple of “begin” is “began”.',
      },
    ],
    quiz: {
      prompt: 'Which sentence correctly describes a past action?',
      options: [
        'Yesterday, I wrote a short summary of the article.',
        'Yesterday, I write a short summary of the article.',
        'Yesterday, I writing a short summary of the article.',
      ],
      correctIndex: 0,
      explanation: '“Yesterday” refers to the past, so use “wrote”, the past simple of “write”.',
    },
  },
];
