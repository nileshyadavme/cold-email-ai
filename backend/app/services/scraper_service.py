"""
Prospect Scraper Service
Scrapes LinkedIn profiles and company pages using httpx + BeautifulSoup.
Extracts: name, role, company, about, recent news/posts.
"""

import logging
import re
import httpx
from bs4 import BeautifulSoup
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.schemas import ProspectData

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


class ProspectScraper:

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=4))
    async def scrape(self, url: str) -> ProspectData:
        """
        Scrape a URL and return structured prospect data.
        Routes to the correct scraper based on URL.
        """
        url = url.strip().rstrip("/")

        if "linkedin.com/in/" in url:
            return await self._scrape_linkedin_profile(url)
        elif "linkedin.com/company/" in url:
            return await self._scrape_linkedin_company(url)
        else:
            return await self._scrape_generic_website(url)

    async def _fetch(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch a URL and return parsed BeautifulSoup or None."""
        try:
            async with httpx.AsyncClient(
                headers=HEADERS,
                timeout=settings.SCRAPE_TIMEOUT,
                follow_redirects=True,
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                return BeautifulSoup(response.text, "lxml")
        except Exception as e:
            logger.warning(f"Fetch failed for {url}: {e}")
            return None

    async def _scrape_linkedin_profile(self, url: str) -> ProspectData:
        """
        Scrape a LinkedIn profile page.
        NOTE: LinkedIn aggressively blocks scrapers in production.
        For production use, consider the LinkedIn API or a service like Proxycurl.
        This works for public profiles without login.
        """
        soup = await self._fetch(url)

        name = "Unknown"
        role = "Unknown Role"
        company = "Unknown Company"
        about = ""

        if soup:
            # Name — LinkedIn public profile
            name_tag = soup.find("h1", {"class": re.compile(r"top-card.*name|text-heading")})
            if name_tag:
                name = name_tag.get_text(strip=True)

            # Role / headline
            role_tag = soup.find("h2", {"class": re.compile(r"top-card.*headline|text-body")})
            if role_tag:
                headline = role_tag.get_text(strip=True)
                # Try to split "Role at Company"
                if " at " in headline:
                    parts = headline.split(" at ", 1)
                    role = parts[0].strip()
                    company = parts[1].strip()
                else:
                    role = headline

            # About section
            about_tag = soup.find("section", {"class": re.compile(r"summary|about")})
            if about_tag:
                about = about_tag.get_text(separator=" ", strip=True)[:500]

        return ProspectData(
            name=name,
            role=role,
            company=company,
            about=about or f"{name} works as {role} at {company}.",
            scraped_from=url,
        )

    async def _scrape_linkedin_company(self, url: str) -> ProspectData:
        """Scrape a LinkedIn company page."""
        soup = await self._fetch(url)

        company = "Unknown Company"
        about = ""

        if soup:
            name_tag = soup.find("h1")
            if name_tag:
                company = name_tag.get_text(strip=True)

            desc_tag = soup.find("p", {"class": re.compile(r"description|about")})
            if desc_tag:
                about = desc_tag.get_text(strip=True)[:500]

        return ProspectData(
            name="Decision Maker",
            role="Key Stakeholder",
            company=company,
            about=about or f"{company} is a company you want to reach.",
            scraped_from=url,
        )

    async def _scrape_generic_website(self, url: str) -> ProspectData:
        """
        Scrape any website — extracts company name, description,
        and any team/about page content.
        """
        soup = await self._fetch(url)

        company = self._extract_domain_name(url)
        about = ""
        recent_news = None

        if soup:
            # Title → company name
            title = soup.find("title")
            if title:
                company = title.get_text(strip=True).split("|")[0].split("-")[0].strip()

            # Meta description → about
            meta = soup.find("meta", {"name": "description"})
            if meta and meta.get("content"):
                about = meta["content"][:400]

            # Look for about/mission sections
            for tag in soup.find_all(["p", "h2", "h3"], limit=30):
                text = tag.get_text(strip=True)
                if any(kw in text.lower() for kw in ["we help", "our mission", "we build", "founded"]):
                    about = (about + " " + text[:300]).strip()
                    break

            # Recent news — look for blog/press links
            news_tags = soup.find_all("a", href=re.compile(r"blog|news|press", re.I), limit=3)
            if news_tags:
                recent_news = "Recent content: " + ", ".join(
                    t.get_text(strip=True) for t in news_tags if t.get_text(strip=True)
                )

        return ProspectData(
            name="Decision Maker",
            role="Key Stakeholder",
            company=company,
            about=about or f"{company} is a company at {url}.",
            recent_news=recent_news,
            scraped_from=url,
        )

    def _extract_domain_name(self, url: str) -> str:
        """Extract clean company name from URL."""
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc
            domain = domain.replace("www.", "").split(".")[0]
            return domain.title()
        except Exception:
            return "Unknown Company"


# Singleton
scraper = ProspectScraper()
