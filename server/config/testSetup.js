import i18n from 'i18n';

i18n.configure({
    directory: 'server/locales',
    defaultLocale: 'cs',
    objectNotation: true,
    updateFiles: false,
});

process.env.NODE_SESSION_COOKIE = 'stamp';