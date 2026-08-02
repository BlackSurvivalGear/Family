import os
import time
from playwright.sync_api import sync_playwright

def run_titles_cuj(page):
    # Set up console log listeners and dialog handlers
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))
    page.on("dialog", lambda dialog: dialog.accept())

    dynamic_email = f"title.test.{int(time.time())}@lawal.org"

    print("Registering a user...")
    page.goto("http://localhost:8000/register.html")
    page.evaluate("""() => {
        localStorage.setItem("firebase_force_simulation", "true");
        localStorage.setItem("cloudinary_force_simulation", "true");
    }""")
    page.reload()
    page.wait_for_timeout(500)
    page.fill("#firstName", "TitleTester")
    page.fill("#lastName", "Lawal")
    page.fill("#email", dynamic_email)
    page.select_option("#generation", "3")
    page.select_option("#branch", "Lagos")
    page.fill("#password", "password123")
    page.fill("#confirmPassword", "password123")
    page.check("#agree")
    page.click("button[type='submit']")

    page.wait_for_selector("#verify-modal.opacity-100", timeout=10000)
    page.click("#mock-verify-btn")
    page.wait_for_timeout(1000)

    print("Logging in...")
    page.goto("http://localhost:8000/signin.html")
    page.wait_for_timeout(500)
    page.fill("#email", dynamic_email)
    page.fill("#password", "password123")
    page.click("button[type='submit']")
    page.wait_for_timeout(1000)

    proceed_btn = page.locator("#proceed-unverified-btn")
    if proceed_btn.is_visible():
        proceed_btn.click()
        page.wait_for_timeout(1000)

    # Elevate role
    page.goto("http://localhost:8000/trees.html")
    page.wait_for_timeout(500)
    page.evaluate("""() => {
        const cached = localStorage.getItem('lawal_current_user');
        if (cached) {
            const parsed = JSON.parse(cached);
            parsed.role = 'SUPER_ADMIN';
            localStorage.setItem('lawal_current_user', JSON.stringify(parsed));
        }
    }""")
    page.reload()
    page.wait_for_timeout(1000)

    # 1. Open Grimster Tree and check titles and breadcrumbs
    print("Opening Grimster Family Tree...")
    grimster_card = page.locator("#trees-grid > div:has-text('Grimster')")
    grimster_card.locator("a:has-text('Open Tree')").click()
    page.wait_for_timeout(2000)

    # Verify Grimster is correct
    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")
    assert "Grimster Family Tree" in page.title()
    banner_title = page.locator("#tree-banner-title").inner_text()
    print(f"Banner Title: {banner_title}")
    assert "Grimster Family Tree" in banner_title

    # Check breadcrumbs (Harold should be the Patriarch)
    breadcrumbs_text = page.locator("#tree-breadcrumbs").inner_text()
    print(f"Breadcrumbs: {breadcrumbs_text}")
    assert "Harold" in breadcrumbs_text

    # Take screenshot of Grimster tree
    page.screenshot(path="verification/screenshots/grimster_tree.png")
    page.wait_for_timeout(500)

    # 2. Scope-based search for Kolawole and auto-switch back to House of Lawal Tree
    print("Searching for Kolawole (cross-tree search)...")
    page.locator("#tree-search-scope").select_option("all")
    page.wait_for_timeout(500)
    page.locator("#tree-search-input").fill("Kolawole")
    page.wait_for_timeout(1000)

    # Click Kolawole Lawal
    autocomplete = page.locator("#tree-search-autocomplete")
    autocomplete.locator("button:has-text('Kolawole')").click()
    page.wait_for_timeout(2000)

    # Verify we are on Lawal Tree and titles updated without page refresh
    print(f"New URL: {page.url}")
    print(f"New Title: {page.title()}")
    assert "House of Lawal Family Tree" in page.title()
    new_banner_title = page.locator("#tree-banner-title").inner_text()
    print(f"New Banner Title: {new_banner_title}")
    assert "House of Lawal Family Tree" in new_banner_title

    # Breadcrumbs (Kolawole should be the Patriarch)
    new_breadcrumbs_text = page.locator("#tree-breadcrumbs").inner_text()
    print(f"New Breadcrumbs: {new_breadcrumbs_text}")
    assert "Kolawole" in new_breadcrumbs_text

    # Take final screenshot
    page.screenshot(path="verification/screenshots/lawal_tree_switched.png")
    print("Screenshots captured successfully!")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    os.makedirs("verification/videos", exist_ok=True)
    print("Running Playwright titles verification CUJ...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_titles_cuj(page)
            print("CUJ completed successfully!")
        finally:
            context.close()
            browser.close()
