export const footerLinks = [['/about', 'About'], ['/accessibility', 'Accessibility'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Use'], ['/disclaimer', 'Disclaimer']];

export function renderFooter(current = '') {
  const links = footerLinks.map(([href, label]) => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `<footer class="site-footer"><nav aria-label="Footer"><ul>${links}</ul></nav><p class="footer-brand"><a href="/" class="wordmark" aria-label="LarpedIn home"><img src="/larpedin-bubble.svg" alt="">LarpedIn</a><span>LarpedIn © 2026</span></p><p class="footer-note">An independent parody. Not affiliated with LinkedIn or any featured company.</p></footer>`;
}
