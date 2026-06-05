module.exports = async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'لا يوجد سؤال' });
    }

    /**
     * 1. البحث باستخدام Google Custom Search API
     * يتطلب وجود مفتاح API و search engine ID في متغيرات البيئة
     */
    async function searchGoogle(query) {
        const apiKey = process.env.GOOGLE_API_KEY;
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !searchEngineId) {
            console.warn('⚠️ مفاتيح Google API غير مهيأة، يتم تخطي البحث في Google');
            return null;
        }

        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const firstResult = data.items[0];
                let snippet = firstResult.snippet || 'لا يوجد ملخص.';
                if (snippet.length > 500) snippet = snippet.substring(0, 500) + '...';
                return {
                    source: 'Google',
                    title: firstResult.title,
                    snippet: snippet,
                    link: firstResult.link
                };
            }
            return null;
        } catch (error) {
            console.error('خطأ في بحث Google:', error);
            return null;
        }
    }

    /**
     * 2. البحث باستخدام Wikipedia API (النسخة الاحتياطية)
     */
    async function searchWikipedia(query) {
        const searchUrl = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.query?.search?.length) {
            return null;
        }

        const title = searchData.query.search[0].title;
        const extractUrl = `https://ar.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(title)}&format=json&origin=*`;
        const extractRes = await fetch(extractUrl);
        const extractData = await extractRes.json();
        const pages = extractData.query.pages;
        const page = pages[Object.keys(pages)[0]];

        let summary = page.extract ? page.extract.substring(0, 600) : 'لا يوجد ملخص.';
        if (page.extract?.length > 600) summary += '...';

        return {
            source: 'Wikipedia',
            title: title,
            snippet: summary,
            link: `https://ar.wikipedia.org/wiki/${encodeURIComponent(title)}`
        };
    }

    // تنفيذ البحث: الأولوية لـ Google، ثم Wikipedia
    let result = await searchGoogle(query);
    let sourceUsed = 'Google';

    if (!result) {
        result = await searchWikipedia(query);
        sourceUsed = 'Wikipedia';
    }

    if (!result) {
        return res.json({ answer: `لم أجد نتائج لـ "${query}". جرب كلمات مفتاحية مختلفة.` });
    }

    // تنسيق الإجابة النهائية
    const answer = `🔍 **نتيجة البحث (${sourceUsed})**\n\n📌 **${result.title}**\n\n📝 ${result.snippet}\n\n🔗 المصدر: ${result.link}`;
    res.json({ answer });
};
