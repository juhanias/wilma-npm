const axios = require('axios');
const cheerio = require('cheerio');
const querystring = require('querystring');
const {
    wrapper
} = require('axios-cookiejar-support');
const {
    CookieJar
} = require('tough-cookie');

class WilmaAPI {
    constructor(username, password, user_id) {
        this.username = username;
        this.password = password;
        this.user_id = user_id;

        this.baseURL = "https://turku.inschool.fi";
        this.oauthAuthorizationURL = "https://sts.edu.turku.fi/adfs/oauth2/authorize/";

        const jar = new CookieJar();
        this.client = wrapper(axios.create({
            jar
        }));
    }

    async login() {
        // TODO full explanation
        // 1. Get the login page
        const loginPage = await this.client.get(this.baseURL);
        const $ = cheerio.load(loginPage.data);
        const loginButtonHref = $('a.pull-left.oid-login-button').attr('href');

        // 2. Fire second request to the oauth endpoint
        const oauthLoginPage = await this.client.get(loginButtonHref);
        const $2 = cheerio.load(oauthLoginPage.data);
        const formActionUrl = $2('form#options').attr('action');

        // 3. Fire a new request to the form action URL with the username and password
        const oauthLogin = await this.client.post(formActionUrl,
            querystring.stringify({
                "UserName": this.username,
                "Password": this.password,
                "AuthMethod": 'FormsAuthentication',
            }), {
                headers: {
                    "Referer": formActionUrl,
                    "Content-Type": "application/x-www-form-urlencoded",
                }
            }
        );

        const $3 = cheerio.load(oauthLogin.data);

        const code = $3('input[name="code"]').attr('value');
        const id_token = $3('input[name="id_token"]').attr('value');
        const state = $3('input[name="state"]').attr('value');

        // 4. Fire a new request to the oauth endpoint with the code, id_token and state
        const oauthLogin2 = await this.client.post(
            "https://turku.inschool.fi/api/v1/external/openid",
            querystring.stringify({
                "code": code,
                "id_token": id_token,
                "state": state
            })
        );

        // const tokenIThink = JSON.parse(JSON.stringify(this.client.defaults.jar.store.idx["turku.inschool.fi"]["/"]["Wilma2SID"]));
    }

    async getMessages() {
        const messages = await this.client.get(
            `https://turku.inschool.fi/!${this.user_id}/messages/list`
        );

        return messages.data;
    }
}