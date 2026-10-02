// News attribution is hidden unless SHOW_NEWS_SOURCE=true (e.g. once a publisher partnership is agreed).
export const showNewsSource = (env = process.env) => env.SHOW_NEWS_SOURCE === 'true';
