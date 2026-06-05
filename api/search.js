module.exports = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'لا يوجد سؤال' });

    async function searchGoogle(q) {
        const key = process.env.GOOGLE_API_KEY;
        const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
        if (!key || !cx) return null;
        const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(q)}`;
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.items && data.items[0]) {
                const item = data.items[0];
                let snippet = item.snippet || '';
                if (snippet.length > 500) snippet = snippet.substr(0,500)+'...';
                return { source:'Google', title:item.title, snippet, link:item.link };
            }
        } catch(e) {}
        return null;
    }

    async function searchWikipedia(q) {
        const searchUrl = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        if (!searchData.query?.search?.length) return null;
        const title = searchData.query.search[0].title;
        const extractUrl = `https://ar.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(title)}&format=json&origin=*`;
        const extractRes = await fetch(extractUrl);
        const extractData = await extractRes.json();
        const page = Object.values(extractData.query.pages)[0];
        let summary = page.extract ? page.extract.substring(0,600) : 'لا يوجد ملخص.';
        if (page.extract?.length > 600) summary += '...';
        return { source:'Wikipedia', title, snippet:summary, link:`https://ar.wikipedia.org/wiki/${encodeURIComponent(title)}` };
    }

    let result = await searchGoogle(query);
    let used = 'Google';
    if (!result) { result = await searchWikipedia(query); used = 'Wikipedia'; }
    if (!result) return res.json({ answer: `⚠️ لم أجد نتائج لـ "${query}".` });

    const answer = `🔍 **نتيجة البحث (${used})**\n\n📌 **${result.title}**\n\n📝 ${result.snippet}\n\n🔗 المصدر: ${result.link}`;
    res.json({ answer });
};
