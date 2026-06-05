// server.js
// يعمل كـ API endpoint: /api/search?q=السؤال

module.exports = async (req, res) => {
    // السماح بـ CORS (للتطوير المحلي)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'يرجى إدخال سؤال' });
    }

    try {
        // 1. البحث في ويكيبيديا عن العناوين المتطابقة
        const searchUrl = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        
        if (!searchData.query || !searchData.query.search.length) {
            return res.json({ answer: `لم أجد نتائج واضحة لـ "${query}". حاول بصيغة مختلفة.` });
        }
        
        // خذ أول عنوان نتيجة
        const bestTitle = searchData.query.search[0].title;
        
        // 2. جلب ملخص الصفحة (extract)
        const extractUrl = `https://ar.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(bestTitle)}&format=json&origin=*`;
        const extractRes = await fetch(extractUrl);
        const extractData = await extractRes.json();
        
        const pages = extractData.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') {
            return res.json({ answer: `وجدت صفحة "${bestTitle}" لكن لا يمكنني استخراج ملخصها.` });
        }
        
        let extract = pages[pageId].extract;
        if (!extract) {
            return res.json({ answer: `لم أتمكن من الحصول على معلومات كافية عن "${bestTitle}".` });
        }
        
        // قص الملخص إلى 700 حرف وإضافة مصدر
        let summary = extract.substring(0, 700);
        if (extract.length > 700) summary += '...';
        
        const answer = `📚 حسب معلومات ويكيبيديا:\n\n${summary}\n\n🔗 المصدر: https://ar.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`;
        
        res.json({ answer });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
};