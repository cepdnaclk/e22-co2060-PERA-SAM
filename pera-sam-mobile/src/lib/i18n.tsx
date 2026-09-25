import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguageCode = 'en' | 'si' | 'ta';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'si', label: 'Sinhala', nativeLabel: 'සිංහල', flag: '🇱🇰' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇱🇰' },
];

const TRANSLATIONS = {
  en: {
    profileDetails: "Profile details",
    editProfile: "Edit profile",
    profileFullName: "Full name",
    profileContactPhone: "Contact number (optional)",
    profilePhoneHint: "Include your country code for international numbers.",
    profileSignInEmail: "Sign-in email (read-only)",
    profileSaving: "Saving profile…",
    profileSaved: "Profile updated successfully.",
    profileDemoSaved: "Profile updated for this demo session only.",
    profileSaveFailed: "Could not save your profile. Check your connection and try again.",
    profileNameInvalid: "Enter a name between 1 and 80 characters.",
    profilePhoneInvalid: "Enter a valid contact number with 7–15 digits.",

    acousticIntelligence: 'Acoustic intelligence',
    heroTitle: 'Know your machine.',
    heroDescription: 'Turn machine sound into a clearer picture of equipment health.',
    lastAnalysis: 'Latest analysis',

    // Tabs
    tabHome: 'Home',
    tabAnalysis: 'Analysis',
    tabTechnicians: 'Technicians',
    tabRequests: 'Requests',
    tabProfile: 'Profile',
    tabHistory: 'History',

    // Common
    loading: 'Loading...',
    refreshing: 'Refreshing...',
    cancel: 'Cancel',
    save: 'Save',
    call: 'Call',
    message: 'Message',
    sendSMS: 'Send SMS',
    callNow: 'Call Now',
    directions: 'Directions',
    requestRepair: 'Request Repair',
    available: 'Available',
    online: 'Online',
    offline: 'Offline',
    error: 'Error',
    success: 'Success',
    all: 'All',

    // Dashboard
    welcomeBack: 'Welcome back',
    systemStatus: 'System Status',
    healthyMachines: 'Operational',
    warningMachines: 'Needs Attention',
    anomalyMachines: 'Critical Alert',
    totalAnalyses: 'Total Analyses',
    quickAnalyze: 'Quick Sound Analysis',
    recentActivity: 'Recent Sound Diagnostics',
    findNearbyTechs: 'Find Nearby Technicians',
    findTechDesc: 'Connect with certified machine acoustic & repair specialists in Sri Lanka.',
    viewAll: 'View All',
    noRecentDiagnostics: 'No sound diagnostics yet. Record or upload machine audio to begin.',

    // Analysis
    analysisTitle: 'Sound Analysis',
    recordAudio: 'Record Audio',
    recording: 'Recording sound...',
    stopRecording: 'Stop Recording',
    uploadAudio: 'Upload Audio File',
    noAudioSelected: 'No audio selected',
    replaceAudio: 'Replace Audio File',
    selectMachine: 'Select Machine Type',
    runAnalysis: 'Analyze Acoustic Signal',
    analyzingSound: 'Running Neural Diagnostic Model...',
    resultNormal: 'Normal Operation',
    resultWarning: 'Early Warning Detected',
    resultAnomaly: 'Severe Acoustic Anomaly',
    confidence: 'Model Confidence',
    modelSummary: 'AI Diagnostic Summary',
    recommendation: 'Recommendation',
    contactTechnicianNotice: 'We recommend consulting a certified technician for inspection.',

    // Technicians & Map
    techniciansTitle: 'Service Technicians',
    searchTechPlaceholder: 'Search technician, city or equipment...',
    filterByEquipment: 'Equipment Filter',
    reviews: 'reviews',
    distance: 'km away',
    directCall: 'Direct Call',
    chatWithTech: 'Chat with Technician',
    sendRepairRequest: 'Send Repair Request',
    requestSentSuccess: 'Repair request submitted to technician.',
    techSpecialties: 'Specialties',
    callTechnicianAlertTitle: 'Call Technician',
    callTechnicianAlertMsg: 'Would you like to place a direct phone call to',

    // Chat
    chatTitle: 'Technician Chat',
    typeMessagePlaceholder: 'Type a message to technician...',
    send: 'Send',
    activeNow: 'Active Now',
    callTechHeader: 'Call Tech',
    autoReplyGreeting: 'Hello! I received your machine diagnostic inquiry. How can I help you today?',

    // Requests
    requestsTitle: 'Service Requests',
    pending: 'Pending',
    accepted: 'In Progress',
    completed: 'Completed',
    declined: 'Declined',
    noRequestsYet: 'No service requests found.',

    // Profile & Settings
    profileTitle: 'Profile & Settings',
    memberSince: 'Member since',
    quickAccess: 'Quick Access',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    modeLight: 'Light',
    modeDark: 'Dark',
    modeSystem: 'System',
    language: 'Language',
    configuration: 'Configuration',
    appInfo: 'App Information',
    appVersion: 'App Version',
    team: 'Team',
    university: 'University',
    signOut: 'Sign Out',
    signOutConfirm: 'Are you sure you want to sign out?',
    languageChanged: 'Language updated successfully',
  },
  si: {
    profileDetails: "පැතිකඩ විස්තර",
    editProfile: "පැතිකඩ සංස්කරණය",
    profileFullName: "සම්පූර්ණ නම",
    profileContactPhone: "දුරකථන අංකය (විකල්පයි)",
    profilePhoneHint: "ජාත්‍යන්තර අංක සඳහා රටේ කේතය ඇතුළත් කරන්න.",
    profileSignInEmail: "පිවිසුම් ඊමේල් (කියවීමට පමණයි)",
    profileSaving: "පැතිකඩ සුරකිමින්…",
    profileSaved: "පැතිකඩ සාර්ථකව යාවත්කාලීන විය.",
    profileDemoSaved: "මෙම ආදර්ශ සැසිය සඳහා පමණක් පැතිකඩ යාවත්කාලීන විය.",
    profileSaveFailed: "පැතිකඩ සුරැකිය නොහැකි විය. සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.",
    profileNameInvalid: "අක්ෂර 1 සිට 80 දක්වා නමක් ඇතුළත් කරන්න.",
    profilePhoneInvalid: "ඉලක්කම් 7–15 සහිත වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න.",

    acousticIntelligence: 'ධ්වනි විශ්ලේෂණය',
    heroTitle: 'ඔබේ යන්ත්‍රය හඳුනාගන්න.',
    heroDescription: 'යන්ත්‍රයේ ශබ්දයෙන් එහි තත්ත්වය පිළිබඳ පැහැදිලි අවබෝධයක් ලබා ගන්න.',
    lastAnalysis: 'නවතම විශ්ලේෂණය',

    // Tabs
    tabHome: 'මුල් පිටුව',
    tabAnalysis: 'විශ්ලේෂණය',
    tabTechnicians: 'කාර්මික ශිල්පීන්',
    tabRequests: 'ඉල්ලීම්',
    tabProfile: 'පැතිකඩ',
    tabHistory: 'ඉතිහාසය',

    // Common
    loading: 'පූරණය වෙමින්...',
    refreshing: 'නැවුම් කරමින්...',
    cancel: 'අවලංගු කරන්න',
    save: 'සුරකින්න',
    call: 'අමතන්න',
    message: 'පණිවිඩය',
    sendSMS: 'SMS යවන්න',
    callNow: 'දැන් අමතන්න',
    directions: 'මාර්ගය',
    requestRepair: 'අලුත්වැඩියා ඉල්ලීම',
    available: 'ලබාගත හැක',
    online: 'සක්‍රියයි',
    offline: 'අක්‍රියයි',
    error: 'දෝෂයකි',
    success: 'සාර්ථකයි',
    all: 'සියල්ල',

    // Dashboard
    welcomeBack: 'නැවත සාදරයෙන් පිළිගනිමු',
    systemStatus: 'පද්ධති තත්ත්වය',
    healthyMachines: 'සාමාන්‍ය ක්‍රියාකාරී',
    warningMachines: 'අවධානය අවශ්‍යයි',
    anomalyMachines: 'දැඩි දෝෂ අනතුරු ඇඟවීම',
    totalAnalyses: 'මුළු විශ්ලේෂණ',
    quickAnalyze: 'ක්ෂණික ශබ්ද විශ්ලේෂණය',
    recentActivity: 'මෑත ශබ්ද පරීක්ෂණ',
    findNearbyTechs: 'ළඟම සිටින කාර්මික ශිල්පීන්',
    findTechDesc: 'ශ්‍රී ලංකාවේ සහතිකලත් යන්ත්‍ර ධ්වනි සහ අලුත්වැඩියා විශේෂඥයින් සොයාගන්න.',
    viewAll: 'සියල්ල බලන්න',
    noRecentDiagnostics: 'තවමත් ශබ්ද පරීක්ෂණ සිදුකර නැත. ආරම්භ කිරීමට යන්ත්‍ර ශබ්දය පටිගත කරන්න.',

    // Analysis
    analysisTitle: 'ශබ්ද විශ්ලේෂණය',
    recordAudio: 'ශබ්දය පටිගත කරන්න',
    recording: 'ශබ්දය පටිගත වෙමින් පවතී...',
    stopRecording: 'පටිගත කිරීම නවත්වන්න',
    uploadAudio: 'ශ්‍රව්‍ය ගොනුවක් උඩුගත කරන්න',
    noAudioSelected: 'ශ්‍රව්‍ය ගොනුවක් තෝරා නැත',
    replaceAudio: 'ශ්‍රව්‍ය ගොනුව වෙනස් කරන්න',
    selectMachine: 'යන්ත්‍ර වර්ගය තෝරන්න',
    runAnalysis: 'ශබ්ද සංඥාව විශ්ලේෂණය කරන්න',
    analyzingSound: 'AI ස්නායුක ආකෘතිය ධාවනය වෙමින්...',
    resultNormal: 'සාමාන්‍ය ක්‍රියාකාරිත්වය',
    resultWarning: 'මුල් අවධියේ අනතුරු ඇඟවීමක්',
    resultAnomaly: 'දැඩි ධ්වනි විෂමතාවක් (Anomaly)',
    confidence: 'ආකෘතියේ විශ්වාසනීයත්වය',
    modelSummary: 'AI රෝග විනිශ්චය සාරාංශය',
    recommendation: 'නිර්දේශය',
    contactTechnicianNotice: 'යන්ත්‍රය පරීක්ෂා කිරීම සඳහා සහතිකලත් කාර්මික ශිල්පියෙකු සම්බන්ධ කර ගැනීමට නිර්දේශ කරමු.',

    // Technicians & Map
    techniciansTitle: 'සේවා කාර්මික ශිල්පීන්',
    searchTechPlaceholder: 'කාර්මික ශිල්පියා, නගරය හෝ උපකරණය සොයන්න...',
    filterByEquipment: 'යන්ත්‍ර උපකරණ පෙරහන',
    reviews: 'ඇගයීම්',
    distance: 'km දුරින්',
    directCall: 'කෙලින්ම අමතන්න',
    chatWithTech: 'කාර්මික ශිල්පියා සමඟ කතාබස්',
    sendRepairRequest: 'අලුත්වැඩියා ඉල්ලීම යවන්න',
    requestSentSuccess: 'අලුත්වැඩියා ඉල්ලීම කාර්මික ශිල්පියා වෙත යවන ලදී.',
    techSpecialties: 'විශේෂඥතා',
    callTechnicianAlertTitle: 'කාර්මික ශිල්පියා ඇමතීම',
    callTechnicianAlertMsg: 'ඔබට මෙම අංකයට දුරකථන ඇමතුමක් ගැනීමට අවශ්‍යද?',

    // Chat
    chatTitle: 'කාර්මික ශිල්පියා සමඟ සංවාදය',
    typeMessagePlaceholder: 'කාර්මික ශිල්පියාට පණිවිඩයක් ටයිප් කරන්න...',
    send: 'යවන්න',
    activeNow: 'දැන් සක්‍රියයි',
    callTechHeader: 'ඇමතුමක් ගන්න',
    autoReplyGreeting: 'ආයුබෝවන්! ඔබේ යන්ත්‍ර ශබ්ද පරීක්ෂණ විස්තර ලැබුණා. අද මට ඔබට උදව් කළ හැක්කේ කෙසේද?',

    // Requests
    requestsTitle: 'සේවා ඉල්ලීම්',
    pending: 'පොරොත්තුවේ',
    accepted: 'ක්‍රියාත්මක වෙමින්',
    completed: 'සම්පූර්ණයි',
    declined: 'ප්‍රතික්ෂේපිතයි',
    noRequestsYet: 'සේවා ඉල්ලීම් කිසිවක් නැත.',

    // Profile & Settings
    profileTitle: 'පැතිකඩ සහ සැකසුම්',
    memberSince: 'සාමාජිකත්වය ලැබුවේ',
    quickAccess: 'ක්ෂණික පිවිසුම්',
    appearance: 'පෙනුම (Appearance)',
    darkMode: 'අඳුරු ප්‍රකාරය (Dark Mode)',
    modeLight: 'ආලෝකවත්',
    modeDark: 'අඳුරු',
    modeSystem: 'පද්ධතිය අනුව',
    language: 'භාෂාව (Language)',
    configuration: 'වින්‍යාසය',
    appInfo: 'යෙදුම් තොරතුරු',
    appVersion: 'යෙදුම් අනුවාදය',
    team: 'කණ්ඩායම',
    university: 'විශ්වවිද්‍යාලය',
    signOut: 'පිටවන්න (Sign Out)',
    signOutConfirm: 'ඔබට සැබවින්ම පිටවීමට අවශ්‍යද?',
    languageChanged: 'භාෂාව සාර්ථකව යාවත්කාලීන විය',
  },
  ta: {
    profileDetails: "சுயவிவர விவரங்கள்",
    editProfile: "சுயவிவரத்தைத் திருத்து",
    profileFullName: "முழுப் பெயர்",
    profileContactPhone: "தொடர்பு எண் (விருப்பமானது)",
    profilePhoneHint: "சர்வதேச எண்களுக்கு நாட்டின் குறியீட்டைச் சேர்க்கவும்.",
    profileSignInEmail: "உள்நுழைவு மின்னஞ்சல் (படிக்க மட்டும்)",
    profileSaving: "சுயவிவரம் சேமிக்கப்படுகிறது…",
    profileSaved: "சுயவிவரம் புதுப்பிக்கப்பட்டது.",
    profileDemoSaved: "இந்த மாதிரி அமர்வுக்கு மட்டும் சுயவிவரம் புதுப்பிக்கப்பட்டது.",
    profileSaveFailed: "சுயவிவரத்தைச் சேமிக்க முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    profileNameInvalid: "1 முதல் 80 எழுத்துகள் கொண்ட பெயரை உள்ளிடவும்.",
    profilePhoneInvalid: "7–15 இலக்கங்கள் கொண்ட சரியான தொடர்பு எண்ணை உள்ளிடவும்.",

    acousticIntelligence: 'ஒலி நுண்ணறிவு',
    heroTitle: 'உங்கள் இயந்திரத்தை அறியுங்கள்.',
    heroDescription: 'இயந்திரத்தின் ஒலியிலிருந்து அதன் நிலையைத் தெளிவாக அறியுங்கள்.',
    lastAnalysis: 'சமீபத்திய பகுப்பாய்வு',

    // Tabs
    tabHome: 'முகப்பு',
    tabAnalysis: 'பகுப்பாய்வு',
    tabTechnicians: 'தொழில்நுட்ப வல்லுநர்கள்',
    tabRequests: 'கோரிக்கைகள்',
    tabProfile: 'சுயவிவரம்',
    tabHistory: 'வரலாறு',

    // Common
    loading: 'ஏற்றுகிறது...',
    refreshing: 'புதுப்பிக்கப்படுகிறது...',
    cancel: 'ரத்துசெய்',
    save: 'சேமி',
    call: 'அழை',
    message: 'செய்தி',
    sendSMS: 'SMS அனுப்பு',
    callNow: 'இப்போதே அழைக்கவும்',
    directions: 'வழிகள்',
    requestRepair: 'பழுதுபார்ப்பு கோரிக்கை',
    available: 'கிடைக்கிறது',
    online: 'செயலில்',
    offline: 'செயலற்றது',
    error: 'பிழை',
    success: 'வெற்றி',
    all: 'அனைத்தும்',

    // Dashboard
    welcomeBack: 'மீண்டும் வருக',
    systemStatus: 'கணினி நிலை',
    healthyMachines: 'வழக்கமான இயக்கம்',
    warningMachines: 'கவனம் தேவை',
    anomalyMachines: 'முக்கிய எச்சரிக்கை',
    totalAnalyses: 'மொத்த பகுப்பாய்வு',
    quickAnalyze: 'விரைவான ஒலி பகுப்பாய்வு',
    recentActivity: 'சமீபத்திய ஒலி சோதனைகள்',
    findNearbyTechs: 'அருகிலுள்ள தொழில்நுட்ப வல்லுநர்கள்',
    findTechDesc: 'இலங்கையில் சான்றளிக்கப்பட்ட இயந்திர ஒலி மற்றும் பழுதுபார்ப்பு நிபுணர்களைக் கண்டறியவும்.',
    viewAll: 'அனைத்தையும் பார்',
    noRecentDiagnostics: 'ஒலி சோதனைகள் எதுவும் இல்லை. தொடங்க இயந்திர ஒலியைப் பதிவுசெய்யவும்.',

    // Analysis
    analysisTitle: 'ஒலி பகுப்பாய்வு',
    recordAudio: 'ஒலியைப் பதிவுசெய்',
    recording: 'ஒலி பதிவு செய்யப்படுகிறது...',
    stopRecording: 'பதிவை நிறுத்து',
    uploadAudio: 'ஆடியோ கோப்பை பதிவேற்றவும்',
    noAudioSelected: 'ஆடியோ கோப்பு தேர்ந்தெடுக்கப்படவில்லை',
    replaceAudio: 'ஆடியோ கோப்பை மாற்றவும்',
    selectMachine: 'இயந்திர வகையைத் தேர்ந்தெடுக்கவும்',
    runAnalysis: 'ஒலி சமிக்ஞையை பகுப்பாய்வு செய்',
    analyzingSound: 'AI நரம்பியல் மாதிரி பகுப்பாய்வு செய்கிறது...',
    resultNormal: 'வழக்கமான இயக்கம் (Normal)',
    resultWarning: 'ஆரம்ப எச்சரிக்கை கண்டறியப்பட்டது',
    resultAnomaly: 'கடுமையான அசாதாரண ஒலி (Anomaly)',
    confidence: 'மாதிரி நம்பிக்கை விகிதம்',
    modelSummary: 'AI கண்டறிதல் சுருக்கம்',
    recommendation: 'பரிந்துரை',
    contactTechnicianNotice: 'ஆய்வுக்காக சான்றளிக்கப்பட்ட தொழில்நுட்ப வல்லுநரைத் தொடர்பு கொள்ள பரிந்துரைக்கிறோம்.',

    // Technicians & Map
    techniciansTitle: 'தொழில்நுட்ப வல்லுநர்கள்',
    searchTechPlaceholder: 'தொழில்நுட்ப வல்லுநர், நகரம் அல்லது இயந்திரத்தைத் தேடுங்கள்...',
    filterByEquipment: 'இயந்திர வடிகட்டி',
    reviews: 'மதிப்புரைகள்',
    distance: 'கி.மீ தூரத்தில்',
    directCall: 'நேரடி அழைப்பு',
    chatWithTech: 'வல்லுநருடன் உரையாடு',
    sendRepairRequest: 'பழுதுபார்ப்பு கோரிக்கையை அனுப்பு',
    requestSentSuccess: 'பழுதுபார்ப்பு கோரிக்கை தொழில்நுட்ப வல்லுநருக்கு அனுப்பப்பட்டது.',
    techSpecialties: 'சிறப்புத்திறன்கள்',
    callTechnicianAlertTitle: 'தொழில்நுட்ப வல்லுநரை அழைக்கவும்',
    callTechnicianAlertMsg: 'நீங்கள் இந்த எண்ணிற்கு நேரடியாக அழைக்க விரும்புகிறீர்களா?',

    // Chat
    chatTitle: 'தொழில்நுட்ப உரையாடல்',
    typeMessagePlaceholder: 'தொழில்நுட்ப வல்லுநருக்கு ஒரு செய்தியைத் தட்டச்சு செய்க...',
    send: 'அனுப்பு',
    activeNow: 'இப்போது செயலில்',
    callTechHeader: 'அழைக்க',
    autoReplyGreeting: 'வணக்கம்! உங்கள் இயந்திர ஒலி சோதனை விவரங்கள் கிடைத்தன. இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',

    // Requests
    requestsTitle: 'சேவை கோரிக்கைகள்',
    pending: 'நிலுவையில்',
    accepted: 'செயல்பாட்டில்',
    completed: 'முடிந்தது',
    declined: 'நிராகரிக்கப்பட்டது',
    noRequestsYet: 'சேவை கோரிக்கைகள் எதுவும் இல்லை.',

    // Profile & Settings
    profileTitle: 'சுயவிவரம் மற்றும் அமைப்புகள்',
    memberSince: 'உறுப்பினர் காலம்',
    quickAccess: 'விரைவு அணுகல்',
    appearance: 'தோற்றம் (Appearance)',
    darkMode: 'இருண்ட பயன்முறை (Dark Mode)',
    modeLight: 'வெளிச்சம்',
    modeDark: 'இருள்',
    modeSystem: 'கணினி முறை',
    language: 'மொழி (Language)',
    configuration: 'அமைப்பு',
    appInfo: 'செயலி தகவல்',
    appVersion: 'பதிப்பு',
    team: 'குழு',
    university: 'பல்கலைக்கழகம்',
    signOut: 'வெளியேறு (Sign Out)',
    signOutConfirm: 'நிச்சயமாக வெளியேற விரும்புகிறீர்களா?',
    languageChanged: 'மொழி வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: TranslationKey) => string;
  isSinhala: boolean;
  isTamil: boolean;
  isEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key: TranslationKey) => TRANSLATIONS.en[key] || key,
  isSinhala: false,
  isTamil: false,
  isEnglish: true,
});

const STORAGE_KEY = '@perasam_language_choice';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'si' || saved === 'ta') {
          setLanguageState(saved);
        }
      })
      .catch((e) => console.warn('Failed to load language preference:', e));
  }, []);

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Failed to persist language preference:', e);
    }
  };

  const t = (key: TranslationKey): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isSinhala: language === 'si',
        isTamil: language === 'ta',
        isEnglish: language === 'en',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
