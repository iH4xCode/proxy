import express from 'express';
import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

let cachedProxies = [];

async function fetchProxies() {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt');
    cachedProxies = res.data.split('\n').filter(ip => ip.includes(':'));
    console.log(`✅ Loaded ${cachedProxies.length} proxies.`);
  } catch (err) {
    console.error('⚠️ Error fetching proxy list:', err.message);
  }
}

fetchProxies();
setInterval(fetchProxies, 10 * 60 * 1000);

app.post('/proxy', async (req, res) => {
  const { url, method = 'GET', headers = {}, data = null } = req.body;

  try {
    if (cachedProxies.length === 0) return res.status(503).send({ error: 'No proxies loaded yet.' });

    const randomProxy = cachedProxies[Math.floor(Math.random() * cachedProxies.length)];
    const agent = new HttpsProxyAgent(`http://${randomProxy}`);

    const response = await axios({
      url,
      method,
      headers,
      data,
      timeout: 10000,
      httpsAgent: agent,
    });

    res.status(response.status).send(response.data);
  } catch (err) {
    res.status(500).send({
      error: err.message,
      proxyUsed: randomProxy,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Proxy API running on port ${PORT}`));
