/**
 * Tone System for SliceURL
 * Provides dynamic greetings and hero descriptions based on selected tone
 * Supports 8 tones x 18 languages
 */

export type Tone = "professional" | "roast" | "love" | "horror" | "suspense" | "breakup" | "motivational" | "playful";

export const tones: Tone[] = ["professional", "roast", "love", "horror", "suspense", "breakup", "motivational", "playful"];

export function getRandomTone(): Tone {
  return tones[Math.floor(Math.random() * tones.length)];
}

type ToneContent = {
  greeting: string;
  heroDesc: string;
};

type ToneTranslations = Record<Tone, ToneContent>;

// Complete translations for all 18 languages and 8 tones
const toneTranslations: Record<string, ToneTranslations> = {
  en: {
    professional: {
      greeting: "The smartest way to share links.",
      heroDesc: "Create beautiful, trackable short links in seconds. Powerful analytics, QR codes, and more.",
    },
    roast: {
      greeting: "Your URLs are embarrassingly long. Let's fix that.",
      heroDesc: "Stop making people scroll through your 200-character disaster links.",
    },
    love: {
      greeting: "Share your links with love 💕",
      heroDesc: "Because every connection deserves a beautiful beginning.",
    },
    horror: {
      greeting: "Your links are... watching.",
      heroDesc: "Track every click. Know exactly who's lurking in the shadows.",
    },
    suspense: {
      greeting: "What happens when they click?",
      heroDesc: "Real-time analytics reveal exactly what happens next...",
    },
    breakup: {
      greeting: "It's not you, it's your long URLs.",
      heroDesc: "Time to move on to something shorter and better.",
    },
    motivational: {
      greeting: "Every great journey starts with a single click.",
      heroDesc: "Your links have unlimited potential. Let's unlock them together.",
    },
    playful: {
      greeting: "Slice, dice, and share! ✂️",
      heroDesc: "Making links fun since... well, right now!",
    },
  },
  hinglish: {
    professional: {
      greeting: "Links share karne ka sabse smart tarika.",
      heroDesc: "Seconds mein beautiful, trackable short links banao.",
    },
    roast: {
      greeting: "Bhai teri URLs itni lambi hai, scroll karte karte thak gaye.",
      heroDesc: "200-character ke disaster links mat bhejo please.",
    },
    love: {
      greeting: "Apne links pyaar se share karo 💕",
      heroDesc: "Kyunki har connection ko acha beginning chahiye.",
    },
    horror: {
      greeting: "Teri links... dekh rahi hai.",
      heroDesc: "Har click track kar. Jaano kaun shadows mein chhupa hai.",
    },
    suspense: {
      greeting: "Click karne pe kya hota hai?",
      heroDesc: "Real-time analytics batata hai aage kya hone wala hai...",
    },
    breakup: {
      greeting: "Problem tum nahi, tumhari lambi URLs hai.",
      heroDesc: "Chhota aur better kuch adopt karne ka time hai.",
    },
    motivational: {
      greeting: "Har badi journey ek click se shuru hoti hai.",
      heroDesc: "Teri links mein unlimited potential hai. Chal unlock karte hai.",
    },
    playful: {
      greeting: "Slice karo, share karo! ✂️",
      heroDesc: "Links ko fun bana rahe hai... abhi se!",
    },
  },
  hi: {
    professional: {
      greeting: "लिंक साझा करने का सबसे स्मार्ट तरीका।",
      heroDesc: "सेकंडों में सुंदर, ट्रैक करने योग्य शॉर्ट लिंक बनाएं।",
    },
    roast: {
      greeting: "आपके URLs शर्मनाक रूप से लंबे हैं। ठीक करते हैं।",
      heroDesc: "लोगों को अपने 200-अक्षर के विनाशकारी लिंक पढ़ने से बचाएं।",
    },
    love: {
      greeting: "प्यार से अपने लिंक साझा करें 💕",
      heroDesc: "क्योंकि हर कनेक्शन एक खूबसूरत शुरुआत का हकदार है।",
    },
    horror: {
      greeting: "आपके लिंक... देख रहे हैं।",
      heroDesc: "हर क्लिक ट्रैक करें। जानें कौन छिपा है।",
    },
    suspense: {
      greeting: "जब वे क्लिक करते हैं तो क्या होता है?",
      heroDesc: "रीयल-टाइम एनालिटिक्स बताता है आगे क्या होगा...",
    },
    breakup: {
      greeting: "समस्या तुम नहीं, तुम्हारे लंबे URLs हैं।",
      heroDesc: "कुछ छोटा और बेहतर अपनाने का समय।",
    },
    motivational: {
      greeting: "हर महान यात्रा एक क्लिक से शुरू होती है।",
      heroDesc: "आपके लिंक में असीमित संभावनाएं हैं।",
    },
    playful: {
      greeting: "काटो, बांटो, और शेयर करो! ✂️",
      heroDesc: "लिंक को मज़ेदार बनाना... अभी से!",
    },
  },
  ta: {
    professional: {
      greeting: "இணைப்புகளைப் பகிர்வதற்கான புத்திசாலித்தனமான வழி।",
      heroDesc: "வினாடிகளில் அழகான, கண்காணிக்கக்கூடிய குறுகிய இணைப்புகளை உருவாக்குங்கள்.",
    },
    roast: {
      greeting: "உங்கள் URLகள் அசிங்கமாக நீளமாக உள்ளன.",
      heroDesc: "உங்கள் 200-எழுத்து பேரழிவு இணைப்புகளை படிக்க வைக்காதீர்கள்.",
    },
    love: {
      greeting: "அன்புடன் உங்கள் இணைப்புகளைப் பகிருங்கள் 💕",
      heroDesc: "ஒவ்வொரு இணைப்பும் அழகான தொடக்கத்திற்கு தகுதியானது.",
    },
    horror: {
      greeting: "உங்கள் இணைப்புகள்... பார்க்கின்றன.",
      heroDesc: "ஒவ்வொரு கிளிக்கையும் கண்காணியுங்கள்.",
    },
    suspense: {
      greeting: "அவர்கள் கிளிக் செய்யும்போது என்ன நடக்கும்?",
      heroDesc: "நிகழ்நேர பகுப்பாய்வு அடுத்து என்ன நடக்கும் என்பதை வெளிப்படுத்துகிறது...",
    },
    breakup: {
      greeting: "பிரச்சனை நீங்கள் அல்ல, உங்கள் நீண்ட URLகள்.",
      heroDesc: "குறுகிய மற்றும் சிறந்ததை தேர்வு செய்யுங்கள்.",
    },
    motivational: {
      greeting: "ஒவ்வொரு பெரிய பயணமும் ஒரு கிளிக்கில் தொடங்குகிறது.",
      heroDesc: "உங்கள் இணைப்புகளுக்கு எல்லையற்ற திறன் உள்ளது.",
    },
    playful: {
      greeting: "வெட்டு, பகிர்! ✂️",
      heroDesc: "இணைப்புகளை வேடிக்கையாக மாற்றுகிறோம்!",
    },
  },
  te: {
    professional: {
      greeting: "లింక్‌లను షేర్ చేయడానికి తెలివైన మార్గం.",
      heroDesc: "సెకన్లలో అందమైన, ట్రాక్ చేయగల షార్ట్ లింక్‌లను సృష్టించండి.",
    },
    roast: {
      greeting: "మీ URLలు అసహ్యంగా పొడవుగా ఉన్నాయి.",
      heroDesc: "మీ 200-అక్షరాల విపత్తు లింక్‌లను చదివించకండి.",
    },
    love: {
      greeting: "ప్రేమతో మీ లింక్‌లను షేర్ చేయండి 💕",
      heroDesc: "ప్రతి కనెక్షన్ అందమైన ప్రారంభానికి అర్హమైనది.",
    },
    horror: {
      greeting: "మీ లింక్‌లు... చూస్తున్నాయి.",
      heroDesc: "ప్రతి క్లిక్‌ను ట్రాక్ చేయండి.",
    },
    suspense: {
      greeting: "వారు క్లిక్ చేసినప్పుడు ఏమి జరుగుతుంది?",
      heroDesc: "రియల్-టైమ్ అనలిటిక్స్ తదుపరి ఏమి జరుగుతుందో వెల్లడిస్తుంది...",
    },
    breakup: {
      greeting: "సమస్య మీరు కాదు, మీ పొడవైన URLలు.",
      heroDesc: "చిన్నదిగా మరియు మెరుగైనదిగా మారే సమయం.",
    },
    motivational: {
      greeting: "ప్రతి గొప్ప ప్రయాణం ఒక క్లిక్‌తో మొదలవుతుంది.",
      heroDesc: "మీ లింక్‌లకు అపరిమిత సామర్థ్యం ఉంది.",
    },
    playful: {
      greeting: "కత్తిరించు, షేర్ చేయి! ✂️",
      heroDesc: "లింక్‌లను సరదాగా మారుస్తున్నాము!",
    },
  },
  or: {
    professional: {
      greeting: "ଲିଙ୍କ ସେୟାର କରିବାର ସ୍ମାର୍ଟ ଉପାୟ।",
      heroDesc: "ସେକେଣ୍ଡରେ ସୁନ୍ଦର, ଟ୍ରାକ୍ କରିବାଯୋଗ୍ୟ ସର୍ଟ ଲିଙ୍କ ତିଆରି କରନ୍ତୁ।",
    },
    roast: {
      greeting: "ଆପଣଙ୍କ URLଗୁଡ଼ିକ ଲଜ୍ଜାଜନକ ଭାବରେ ଲମ୍ବା।",
      heroDesc: "ଆପଣଙ୍କ 200-ଅକ୍ଷର ବିପର୍ଯ୍ୟୟ ଲିଙ୍କ ପଢ଼ାନ୍ତୁ ନାହିଁ।",
    },
    love: {
      greeting: "ଭଲ ପାଇବା ସହିତ ଆପଣଙ୍କ ଲିଙ୍କ ସେୟାର କରନ୍ତୁ 💕",
      heroDesc: "ପ୍ରତ୍ୟେକ ସଂଯୋଗ ଏକ ସୁନ୍ଦର ଆରମ୍ଭର ଯୋଗ୍ୟ।",
    },
    horror: {
      greeting: "ଆପଣଙ୍କ ଲିଙ୍କ... ଦେଖୁଛି।",
      heroDesc: "ପ୍ରତ୍ୟେକ କ୍ଲିକ୍ ଟ୍ରାକ୍ କରନ୍ତୁ।",
    },
    suspense: {
      greeting: "ସେମାନେ କ୍ଲିକ୍ କଲେ କ'ଣ ହେବ?",
      heroDesc: "ରିଅଲ-ଟାଇମ ଆନାଲିଟିକ୍ସ ପରବର୍ତ୍ତୀ କ'ଣ ହେବ ତାହା ପ୍ରକାଶ କରେ...",
    },
    breakup: {
      greeting: "ସମସ୍ୟା ଆପଣ ନୁହଁ, ଆପଣଙ୍କ ଲମ୍ବା URLଗୁଡ଼ିକ।",
      heroDesc: "ଛୋଟ ଏବଂ ଭଲ କିଛିକୁ ବଦଳାଇବାର ସମୟ।",
    },
    motivational: {
      greeting: "ପ୍ରତ୍ୟେକ ମହାନ ଯାତ୍ରା ଏକ କ୍ଲିକ୍ ରେ ଆରମ୍ଭ ହୁଏ।",
      heroDesc: "ଆପଣଙ୍କ ଲିଙ୍କର ଅସୀମ ସମ୍ଭାବନା ଅଛି।",
    },
    playful: {
      greeting: "କାଟ, ସେୟାର କର! ✂️",
      heroDesc: "ଲିଙ୍କକୁ ମଜାଦାର କରୁଛୁ!",
    },
  },
  fr: {
    professional: {
      greeting: "La façon la plus intelligente de partager des liens.",
      heroDesc: "Créez de beaux liens courts traçables en quelques secondes.",
    },
    roast: {
      greeting: "Vos URLs sont embarrassantes de longueur.",
      heroDesc: "Arrêtez de faire défiler vos liens de 200 caractères.",
    },
    love: {
      greeting: "Partagez vos liens avec amour 💕",
      heroDesc: "Chaque connexion mérite un beau début.",
    },
    horror: {
      greeting: "Vos liens... vous regardent.",
      heroDesc: "Suivez chaque clic. Sachez qui se cache.",
    },
    suspense: {
      greeting: "Que se passe-t-il quand ils cliquent?",
      heroDesc: "L'analytique en temps réel révèle ce qui se passe ensuite...",
    },
    breakup: {
      greeting: "Ce n'est pas vous, ce sont vos longs URLs.",
      heroDesc: "Il est temps de passer à quelque chose de plus court.",
    },
    motivational: {
      greeting: "Chaque grand voyage commence par un clic.",
      heroDesc: "Vos liens ont un potentiel illimité.",
    },
    playful: {
      greeting: "Coupez, partagez! ✂️",
      heroDesc: "Rendre les liens amusants... maintenant!",
    },
  },
  de: {
    professional: {
      greeting: "Der smarteste Weg, Links zu teilen.",
      heroDesc: "Erstellen Sie in Sekunden schöne, verfolgbare Kurzlinks.",
    },
    roast: {
      greeting: "Ihre URLs sind peinlich lang.",
      heroDesc: "Hören Sie auf, Ihre 200-Zeichen-Katastrophenlinks zu teilen.",
    },
    love: {
      greeting: "Teilen Sie Ihre Links mit Liebe 💕",
      heroDesc: "Jede Verbindung verdient einen schönen Anfang.",
    },
    horror: {
      greeting: "Ihre Links... beobachten.",
      heroDesc: "Verfolgen Sie jeden Klick. Wissen Sie, wer lauert.",
    },
    suspense: {
      greeting: "Was passiert, wenn sie klicken?",
      heroDesc: "Echtzeit-Analytik zeigt, was als nächstes passiert...",
    },
    breakup: {
      greeting: "Es liegt nicht an Ihnen, es sind Ihre langen URLs.",
      heroDesc: "Zeit, zu etwas Kürzerem zu wechseln.",
    },
    motivational: {
      greeting: "Jede große Reise beginnt mit einem Klick.",
      heroDesc: "Ihre Links haben unbegrenztes Potenzial.",
    },
    playful: {
      greeting: "Schneiden, teilen! ✂️",
      heroDesc: "Links lustig machen... jetzt!",
    },
  },
  es: {
    professional: {
      greeting: "La forma más inteligente de compartir enlaces.",
      heroDesc: "Crea enlaces cortos rastreables en segundos.",
    },
    roast: {
      greeting: "Tus URLs son vergonzosamente largos.",
      heroDesc: "Deja de hacer que la gente lea tus enlaces de 200 caracteres.",
    },
    love: {
      greeting: "Comparte tus enlaces con amor 💕",
      heroDesc: "Cada conexión merece un hermoso comienzo.",
    },
    horror: {
      greeting: "Tus enlaces... están mirando.",
      heroDesc: "Rastrea cada clic. Sabe quién acecha.",
    },
    suspense: {
      greeting: "¿Qué pasa cuando hacen clic?",
      heroDesc: "La analítica en tiempo real revela lo que sucede después...",
    },
    breakup: {
      greeting: "No eres tú, son tus URLs largas.",
      heroDesc: "Es hora de cambiar a algo más corto.",
    },
    motivational: {
      greeting: "Todo gran viaje comienza con un clic.",
      heroDesc: "Tus enlaces tienen potencial ilimitado.",
    },
    playful: {
      greeting: "¡Corta, comparte! ✂️",
      heroDesc: "Haciendo los enlaces divertidos... ¡ahora!",
    },
  },
  pt: {
    professional: {
      greeting: "A forma mais inteligente de compartilhar links.",
      heroDesc: "Crie links curtos rastreáveis em segundos.",
    },
    roast: {
      greeting: "Suas URLs são embaraçosamente longas.",
      heroDesc: "Pare de fazer as pessoas lerem seus links de 200 caracteres.",
    },
    love: {
      greeting: "Compartilhe seus links com amor 💕",
      heroDesc: "Cada conexão merece um começo bonito.",
    },
    horror: {
      greeting: "Seus links... estão observando.",
      heroDesc: "Rastreie cada clique. Saiba quem está à espreita.",
    },
    suspense: {
      greeting: "O que acontece quando clicam?",
      heroDesc: "Análises em tempo real revelam o que acontece depois...",
    },
    breakup: {
      greeting: "Não é você, são suas URLs longas.",
      heroDesc: "Hora de mudar para algo mais curto.",
    },
    motivational: {
      greeting: "Toda grande jornada começa com um clique.",
      heroDesc: "Seus links têm potencial ilimitado.",
    },
    playful: {
      greeting: "Corte, compartilhe! ✂️",
      heroDesc: "Tornando links divertidos... agora!",
    },
  },
  it: {
    professional: {
      greeting: "Il modo più intelligente per condividere link.",
      heroDesc: "Crea link brevi tracciabili in pochi secondi.",
    },
    roast: {
      greeting: "I tuoi URL sono imbarazzantemente lunghi.",
      heroDesc: "Smetti di far leggere i tuoi link di 200 caratteri.",
    },
    love: {
      greeting: "Condividi i tuoi link con amore 💕",
      heroDesc: "Ogni connessione merita un bel inizio.",
    },
    horror: {
      greeting: "I tuoi link... stanno guardando.",
      heroDesc: "Traccia ogni clic. Scopri chi si nasconde.",
    },
    suspense: {
      greeting: "Cosa succede quando cliccano?",
      heroDesc: "L'analisi in tempo reale rivela cosa succede dopo...",
    },
    breakup: {
      greeting: "Non sei tu, sono i tuoi lunghi URL.",
      heroDesc: "È ora di passare a qualcosa di più corto.",
    },
    motivational: {
      greeting: "Ogni grande viaggio inizia con un clic.",
      heroDesc: "I tuoi link hanno un potenziale illimitato.",
    },
    playful: {
      greeting: "Taglia, condividi! ✂️",
      heroDesc: "Rendendo i link divertenti... ora!",
    },
  },
  ru: {
    professional: {
      greeting: "Самый умный способ делиться ссылками.",
      heroDesc: "Создавайте отслеживаемые короткие ссылки за секунды.",
    },
    roast: {
      greeting: "Ваши URL позорно длинные.",
      heroDesc: "Хватит заставлять людей читать ваши ссылки из 200 символов.",
    },
    love: {
      greeting: "Делитесь ссылками с любовью 💕",
      heroDesc: "Каждое соединение заслуживает красивого начала.",
    },
    horror: {
      greeting: "Ваши ссылки... наблюдают.",
      heroDesc: "Отслеживайте каждый клик. Знайте, кто прячется.",
    },
    suspense: {
      greeting: "Что произойдет, когда они кликнут?",
      heroDesc: "Аналитика в реальном времени показывает, что будет дальше...",
    },
    breakup: {
      greeting: "Дело не в вас, а в ваших длинных URL.",
      heroDesc: "Пора перейти на что-то короче.",
    },
    motivational: {
      greeting: "Каждое великое путешествие начинается с клика.",
      heroDesc: "Ваши ссылки имеют безграничный потенциал.",
    },
    playful: {
      greeting: "Режь, делись! ✂️",
      heroDesc: "Делаем ссылки веселыми... прямо сейчас!",
    },
  },
  ar: {
    professional: {
      greeting: "الطريقة الأذكى لمشاركة الروابط.",
      heroDesc: "أنشئ روابط قصيرة قابلة للتتبع في ثوانٍ.",
    },
    roast: {
      greeting: "روابطك طويلة بشكل محرج.",
      heroDesc: "توقف عن جعل الناس يقرأون روابطك المكونة من 200 حرف.",
    },
    love: {
      greeting: "شارك روابطك بحب 💕",
      heroDesc: "كل اتصال يستحق بداية جميلة.",
    },
    horror: {
      greeting: "روابطك... تراقب.",
      heroDesc: "تتبع كل نقرة. اعرف من يختبئ.",
    },
    suspense: {
      greeting: "ماذا يحدث عندما ينقرون؟",
      heroDesc: "التحليلات الحية تكشف ما سيحدث بعد ذلك...",
    },
    breakup: {
      greeting: "المشكلة ليست أنت، إنها روابطك الطويلة.",
      heroDesc: "حان الوقت للانتقال إلى شيء أقصر.",
    },
    motivational: {
      greeting: "كل رحلة عظيمة تبدأ بنقرة.",
      heroDesc: "روابطك لها إمكانات غير محدودة.",
    },
    playful: {
      greeting: "قص، شارك! ✂️",
      heroDesc: "نجعل الروابط ممتعة... الآن!",
    },
  },
  ja: {
    professional: {
      greeting: "リンクを共有する最もスマートな方法。",
      heroDesc: "数秒で美しく追跡可能な短縮リンクを作成。",
    },
    roast: {
      greeting: "あなたのURLは恥ずかしいほど長いです。",
      heroDesc: "200文字の災害リンクを読ませるのはやめましょう。",
    },
    love: {
      greeting: "愛を込めてリンクを共有 💕",
      heroDesc: "すべての接続は美しい始まりに値します。",
    },
    horror: {
      greeting: "あなたのリンクは...見ています。",
      heroDesc: "すべてのクリックを追跡。誰が潜んでいるか把握。",
    },
    suspense: {
      greeting: "クリックすると何が起こる？",
      heroDesc: "リアルタイム分析が次に何が起こるか明らかに...",
    },
    breakup: {
      greeting: "問題はあなたではなく、長いURLです。",
      heroDesc: "より短いものに切り替える時です。",
    },
    motivational: {
      greeting: "すべての偉大な旅は1回のクリックから始まります。",
      heroDesc: "あなたのリンクには無限の可能性があります。",
    },
    playful: {
      greeting: "切って、共有！✂️",
      heroDesc: "リンクを楽しくする...今！",
    },
  },
  ko: {
    professional: {
      greeting: "링크를 공유하는 가장 스마트한 방법.",
      heroDesc: "몇 초 만에 추적 가능한 짧은 링크를 만드세요.",
    },
    roast: {
      greeting: "당신의 URL은 부끄러울 정도로 깁니다.",
      heroDesc: "200자 재앙 링크를 읽게 하지 마세요.",
    },
    love: {
      greeting: "사랑으로 링크를 공유하세요 💕",
      heroDesc: "모든 연결은 아름다운 시작을 받을 자격이 있습니다.",
    },
    horror: {
      greeting: "당신의 링크가... 지켜보고 있습니다.",
      heroDesc: "모든 클릭을 추적. 누가 숨어있는지 파악.",
    },
    suspense: {
      greeting: "클릭하면 무슨 일이 일어날까요?",
      heroDesc: "실시간 분석이 다음에 무슨 일이 일어나는지 보여줍니다...",
    },
    breakup: {
      greeting: "문제는 당신이 아니라 긴 URL입니다.",
      heroDesc: "더 짧은 것으로 바꿀 시간입니다.",
    },
    motivational: {
      greeting: "모든 위대한 여정은 한 번의 클릭으로 시작됩니다.",
      heroDesc: "당신의 링크에는 무한한 잠재력이 있습니다.",
    },
    playful: {
      greeting: "자르고, 공유하세요! ✂️",
      heroDesc: "링크를 재미있게 만드는 중... 지금!",
    },
  },
  zh: {
    professional: {
      greeting: "最聪明的链接分享方式。",
      heroDesc: "几秒钟内创建精美、可追踪的短链接。",
    },
    roast: {
      greeting: "你的网址太长了，真丢人。",
      heroDesc: "别让人滚动你那200字符的灾难链接。",
    },
    love: {
      greeting: "用爱分享你的链接 💕",
      heroDesc: "因为每一次连接都值得美丽的开始。",
    },
    horror: {
      greeting: "你的链接正在...监视。",
      heroDesc: "追踪每一次点击。知道谁在暗中潜伏。",
    },
    suspense: {
      greeting: "他们点击后会发生什么？",
      heroDesc: "实时分析揭示接下来会发生什么...",
    },
    breakup: {
      greeting: "问题不是你，是你的长网址。",
      heroDesc: "是时候换成更短更好的了。",
    },
    motivational: {
      greeting: "每一段伟大的旅程都始于一次点击。",
      heroDesc: "你的链接有无限潜力。让我们一起释放它们。",
    },
    playful: {
      greeting: "切片、切块、分享！✂️",
      heroDesc: "从现在开始让链接变得有趣！",
    },
  },
  id: {
    professional: {
      greeting: "Cara paling cerdas berbagi tautan.",
      heroDesc: "Buat tautan pendek yang dapat dilacak dalam hitungan detik.",
    },
    roast: {
      greeting: "URL Anda memalukan panjangnya.",
      heroDesc: "Berhenti membuat orang membaca tautan 200 karakter Anda.",
    },
    love: {
      greeting: "Bagikan tautan Anda dengan cinta 💕",
      heroDesc: "Setiap koneksi layak mendapat awal yang indah.",
    },
    horror: {
      greeting: "Tautan Anda... sedang mengawasi.",
      heroDesc: "Lacak setiap klik. Ketahui siapa yang mengintai.",
    },
    suspense: {
      greeting: "Apa yang terjadi saat mereka klik?",
      heroDesc: "Analitik real-time mengungkapkan apa yang terjadi selanjutnya...",
    },
    breakup: {
      greeting: "Masalahnya bukan Anda, tapi URL panjang Anda.",
      heroDesc: "Saatnya beralih ke sesuatu yang lebih pendek.",
    },
    motivational: {
      greeting: "Setiap perjalanan besar dimulai dengan satu klik.",
      heroDesc: "Tautan Anda memiliki potensi tak terbatas.",
    },
    playful: {
      greeting: "Potong, bagikan! ✂️",
      heroDesc: "Membuat tautan menjadi menyenangkan... sekarang!",
    },
  },
  tr: {
    professional: {
      greeting: "Bağlantı paylaşmanın en akıllı yolu.",
      heroDesc: "Saniyeler içinde takip edilebilir kısa bağlantılar oluşturun.",
    },
    roast: {
      greeting: "URL'leriniz utanç verici derecede uzun.",
      heroDesc: "İnsanlara 200 karakterlik felaket bağlantılarınızı okutmayı bırakın.",
    },
    love: {
      greeting: "Bağlantılarınızı sevgiyle paylaşın 💕",
      heroDesc: "Her bağlantı güzel bir başlangıcı hak ediyor.",
    },
    horror: {
      greeting: "Bağlantılarınız... izliyor.",
      heroDesc: "Her tıklamayı takip edin. Kimin gizlendiğini bilin.",
    },
    suspense: {
      greeting: "Tıkladıklarında ne olur?",
      heroDesc: "Gerçek zamanlı analitik sonra ne olacağını ortaya koyuyor...",
    },
    breakup: {
      greeting: "Sorun siz değilsiniz, uzun URL'leriniz.",
      heroDesc: "Daha kısa bir şeye geçme zamanı.",
    },
    motivational: {
      greeting: "Her büyük yolculuk tek bir tıklamayla başlar.",
      heroDesc: "Bağlantılarınızın sınırsız potansiyeli var.",
    },
    playful: {
      greeting: "Kes, paylaş! ✂️",
      heroDesc: "Bağlantıları eğlenceli hale getiriyoruz... şimdi!",
    },
  },
};

export function getGreeting(language: string, tone: Tone): string {
  const langContent = toneTranslations[language] || toneTranslations.en;
  return langContent[tone]?.greeting || toneTranslations.en[tone].greeting;
}

export function getHeroDesc(language: string, tone: Tone): string {
  const langContent = toneTranslations[language] || toneTranslations.en;
  return langContent[tone]?.heroDesc || toneTranslations.en[tone].heroDesc;
}
