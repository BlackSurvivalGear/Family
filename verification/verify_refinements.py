import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_cuj(page):
    dynamic_email = f"refine.test.{int(time.time())}@lawal.org"

    print("Step 1: Registering a new simulated user...")
    page.goto("http://localhost:8000/register.html")
    page.evaluate("""() => {
        localStorage.setItem("firebase_force_simulation", "true");
        localStorage.setItem("cloudinary_force_simulation", "true");
    }""")
    page.reload()
    page.wait_for_timeout(1000)
    page.fill("#firstName", "RefineAdmin")
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
    page.wait_for_timeout(1500)

    print("Step 2: Logging in the user...")
    page.goto("http://localhost:8000/signin.html")
    page.wait_for_timeout(1000)
    page.fill("#email", dynamic_email)
    page.fill("#password", "password123")
    page.click("button[type='submit']")
    page.wait_for_timeout(1500)

    proceed_btn = page.locator("#proceed-unverified-btn")
    if proceed_btn.is_visible():
        proceed_btn.click()
        page.wait_for_timeout(2000)

    # Elevate role to SUPER_ADMIN so we can check everything including statistics, selectors, and permissions
    print("Step 3: Elevating role to SUPER_ADMIN...")
    page.goto("http://localhost:8000/trees.html")
    page.wait_for_timeout(1000)
    page.evaluate("""() => {
        const cached = localStorage.getItem('lawal_current_user');
        if (cached) {
            const parsed = JSON.parse(cached);
            parsed.role = 'SUPER_ADMIN';
            localStorage.setItem('lawal_current_user', JSON.stringify(parsed));
        }
    }""")
    page.reload()
    page.wait_for_timeout(1500)

    # Save a screenshot of the Family Trees landing page
    page.screenshot(path="verification/screenshots/family_trees_landing.png")
    print("Family Trees page screenshot taken.")

    print("Step 4: Navigating to Grimster Family Tree (tree-grimster.html)")
    page.goto("http://localhost:8000/tree-grimster.html?treeId=grimster")
    page.wait_for_timeout(1500)

    # Save a screenshot of the compact Grimster Family Tree page with the 50% reduced header
    page.screenshot(path="verification/screenshots/grimster_tree_compact.png")
    print("Grimster Family Tree page screenshot taken.")

    print("Step 5: Navigating to Family Members Directory (members.html)")
    page.goto("http://localhost:8000/members.html")
    page.wait_for_timeout(1500)

    # Open the Recycle Bin modal
    print("Opening the Recycle Bin modal...")
    page.locator("#open-recycle-bin-btn").click()
    page.wait_for_timeout(1500)

    # Save a screenshot of the Recycle Bin modal on the directory page
    page.screenshot(path="verification/screenshots/recycle_bin_modal.png")
    print("Recycle Bin modal screenshot taken.")

    # Close modal
    page.locator("#close-recycle-modal-btn").click()
    page.wait_for_timeout(500)

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    os.makedirs("verification/videos", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
        print("Frontend refinements CUJ execution completed successfully!")
