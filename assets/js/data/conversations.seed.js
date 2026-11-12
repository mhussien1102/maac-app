/**
 * Mock data: conversations and canned assistant answers.
 * ---------------------------------------------------------------------------
 * ⚠️ Demo content only. Replace the services that read this file with real
 *    API calls when the back-end is ready (see services/*.service.js).
 *
 * Message shape
 *   user:      { id, role: 'user', text }
 *   assistant: { id, role: 'assistant', thinking?: string[], blocks: Block[], source?: { file, page } }
 *
 * Block shapes
 *   { type: 'text',  text }
 *   { type: 'list',  items: string[] }
 *   { type: 'table', rows: [{ label, value, highlight? }] }
 *
 * Numbers use Eastern Arabic digits and the Arabic separators (٬ ٫ ٪), exactly
 * like the answers shown in the design.
 */

/* ------------------------------------------------------------------ answers */

export const ANSWER_601 = {
  role: 'assistant',
  thinking: [
    'بدوّر في الملفات المفهرسة عن «بند 601».',
    'لقيت البند في ملف 2025 GTC-1.pdf صفحة ٢٧ (الأصول الثابتة).',
    'قارنت قيمة سنة الإقرار بالسنة السابقة وحسبت الفرق والنسبة.',
    'راجعت بند ٧٠٦ (الإهلاك) في قائمة الدخل وطابقته مع الفرق.',
  ],
  blocks: [
    {
      type: 'text',
      text: 'بند ٦٠١ (الأصول الثابتة) انخفض من ٤٬٦٥٦٬٢٥٠٫٠ في السنة السابقة إلى ٤٬٦٢٥٬٠٠٠٫٠ في سنة الإقرار، بفرق ٣١٬٢٥٠ جنيه (حوالي ٠٫٦٧٪).',
    },
    {
      type: 'table',
      rows: [
        { label: 'السنة السابقة', value: '٤٬٦٥٦٬٢٥٠٫٠' },
        { label: 'سنة الإقرار', value: '٤٬٦٢٥٬٠٠٠٫٠' },
        { label: 'الفرق', value: '−٣١٬٢٥٠٫٠', highlight: true },
      ],
    },
    {
      type: 'text',
      text: 'الفرق يطابق إهلاك الأصول الثابتة المسجّل في قائمة الدخل (بند ٧٠٦: ٣١٬٢٥٠)، وده معناه غالباً إن مفيش إضافات أو استبعادات على الأصول خلال السنة.',
    },
  ],
  source: { file: '2025 GTC-1.pdf', page: '٢٧' },
};

export const ANSWER_BRANCHES = {
  role: 'assistant',
  thinking: ['السؤال عام عن المحاسبة ومش مرتبط بملف معيّن، فهجاوب من المعرفة العامة.'],
  blocks: [
    { type: 'text', text: 'فروع علم المحاسبة الرئيسية هي:' },
    {
      type: 'list',
      items: [
        'المحاسبة المالية: إعداد القوائم المالية للأطراف الخارجية.',
        'محاسبة التكاليف: قياس وتحليل تكلفة المنتجات والخدمات.',
        'المحاسبة الإدارية: توفير معلومات تساعد الإدارة في التخطيط واتخاذ القرار.',
        'المراجعة: فحص القوائم المالية وإبداء الرأي في عدالتها.',
        'المحاسبة الضريبية: حساب الالتزامات الضريبية وإعداد الإقرارات.',
        'نظم المعلومات المحاسبية: تصميم وتشغيل النظم اللي بتجمع البيانات المالية.',
      ],
    },
    { type: 'text', text: 'ملحوظة: الإجابة دي معلومة عامة، مش مأخوذة من الملفات اللي أضفتها.' },
  ],
};

export const ANSWER_TAX_SUMMARY = {
  role: 'assistant',
  thinking: [
    'فتحت ملخص الإقرار الضريبي في ملف 2025 GTC-1.pdf.',
    'جمعت الإيرادات والمصروفات وحسبت الوعاء الضريبي.',
  ],
  blocks: [
    { type: 'text', text: 'ملخص الإقرار الضريبي لسنة ٢٠٢٥ (أرقام تجريبية):' },
    {
      type: 'table',
      rows: [
        { label: 'إجمالي الإيرادات', value: '١٢٬٥٠٠٬٠٠٠٫٠' },
        { label: 'إجمالي المصروفات', value: '٩٬٨٧٥٬٠٠٠٫٠' },
        { label: 'صافي الربح قبل الضريبة', value: '٢٬٦٢٥٬٠٠٠٫٠' },
        { label: 'الضريبة المستحقة (٢٢٫٥٪)', value: '٥٩٠٬٦٢٥٫٠', highlight: true },
      ],
    },
    { type: 'text', text: 'الأرقام دي مأخوذة من صفحة الملخص في بداية الإقرار.' },
  ],
  source: { file: '2025 GTC-1.pdf', page: '٣' },
};

export const ANSWER_COMPARE = {
  role: 'assistant',
  thinking: [
    'قارنت بنود قائمة المركز المالي بين السنة السابقة وسنة الإقرار.',
    'رتّبت البنود حسب حجم التغيير.',
  ],
  blocks: [
    { type: 'text', text: 'أكبر تغيير بين السنتين كان في بند الأصول الثابتة (٦٠١) بسبب الإهلاك:' },
    {
      type: 'table',
      rows: [
        { label: 'الأصول الثابتة (٦٠١)', value: '−٣١٬٢٥٠٫٠', highlight: true },
        { label: 'إهلاك السنة (٧٠٦)', value: '٣١٬٢٥٠٫٠' },
      ],
    },
    { type: 'text', text: 'باقي البنود تغيّرت بنسب صغيرة ومفيش حاجة غير معتادة في الملفات اللي أضفتها.' },
  ],
  source: { file: '2025 GTC-1.pdf', page: '٢٧' },
};

export const ANSWER_FALLBACK = {
  role: 'assistant',
  thinking: ['دي إجابة تجريبية، لسه مفيش ربط بالـ API الحقيقي.'],
  blocks: [
    {
      type: 'text',
      text: 'دي نسخة تجريبية من الواجهة، فالإجابة هنا شكلية. لما تربط المشروع بالـ API الحقيقي هتظهر هنا إجابة من الملفات اللي أضفتها للداتا سيت.',
    },
  ],
};

/** Keyword → answer (first match wins). Used by services/assistant.service.js */
export const ANSWER_RULES = [
  { test: /601|بند/, answer: ANSWER_601 },
  { test: /لخ[ّ]?ص|ملخص|الإقرار/, answer: ANSWER_TAX_SUMMARY },
  { test: /قارن|مقارنة|السنتين|التغيير/, answer: ANSWER_COMPARE },
  { test: /فروع|المحاسبة/, answer: ANSWER_BRANCHES },
];

/* ------------------------------------------------------------ conversations */

export const SEED_CONVERSATIONS = [
  {
    id: 'c-601',
    title: 'قيمة بند 601 في السنتين',
    messages: [
      { id: 'c-601-u1', role: 'user', text: 'ما هي قيمة بند 601 في السنتين وفسّر التغيير؟' },
      { id: 'c-601-a1', ...ANSWER_601 },
    ],
  },
  {
    id: 'c-branches',
    title: 'فروع علم المحاسبة',
    messages: [
      { id: 'c-branches-u1', role: 'user', text: 'ما هي فروع علم المحاسبة؟' },
      { id: 'c-branches-a1', ...ANSWER_BRANCHES },
    ],
  },
  {
    id: 'c-tax',
    title: 'ملخص ملف الإقرار الضريبي',
    messages: [
      { id: 'c-tax-u1', role: 'user', text: 'لخّص ملف الإقرار الضريبي' },
      { id: 'c-tax-a1', ...ANSWER_TAX_SUMMARY },
    ],
  },
];
