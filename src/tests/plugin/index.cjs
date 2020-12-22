const mailhog = require('mailhog')({
    host: 'localhost'
});

module.exports = (on, config) => {
    on('task', {
        async getLinkFromLastMail(email) {
            const { html, ID } = await mailhog.latestTo(email);

            console.log(ID);

            await mailhog.deleteMessage(ID);

            return html.match(/<a\s[^>]+>([^<]+)<\/[^>]+>/).pop();
        }
    })
};