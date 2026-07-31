import os
import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    print("Step 1: Navigating to register.html")
    page.goto("http://localhost:8000/register.html")
    page.wait_for_timeout(1000)

    print("Step 2: Testing Password Mismatch Validation")
    page.fill("#firstName", "Jane")
    page.fill("#lastName", "Lawal")
    page.fill("#email", "jane.lawal@example.com")
    page.select_option("#generation", "3")
    page.select_option("#branch", "London")
    page.fill("#password", "password123")
    page.fill("#confirmPassword", "password456") # Mismatching
    page.check("#agree")
    page.wait_for_timeout(500)

    # Click register
    page.click("button[type='submit']")
    page.wait_for_timeout(1000)

    # Check alert box is visible and contains warning
    alert_box = page.locator("#alert-box")
    if alert_box.is_visible():
        print("Success: Mismatch warning displayed correctly:", alert_box.inner_text())
    else:
        print("Error: Alert box for password mismatch not visible!")

    # Take screenshot of mismatch error
    page.screenshot(path="/app/verification/screenshots/password_mismatch.png")

    print("Step 3: Correcting password to match")
    page.fill("#confirmPassword", "password123") # Correcting
    page.wait_for_timeout(500)

    # Click register again
    page.click("button[type='submit']")
    page.wait_for_timeout(1500)

    # Email verification modal should be visible
    verify_modal = page.locator("#verify-modal")
    if "opacity-100" in verify_modal.get_attribute("class"):
        print("Success: Email Verification Modal displayed!")
    else:
        print("Error: Email Verification Modal is NOT active!")

    # Take screenshot of email verification modal
    page.screenshot(path="/app/verification/screenshots/email_modal.png")

    print("Step 4: Confirming simulated email verification")
    page.click("#mock-verify-btn")
    page.wait_for_timeout(2000)

    # Should redirect to dashboard.html
    print("Current URL:", page.url)
    if "dashboard.html" in page.url:
        print("Success: Redirected to dashboard.html!")
    else:
        print("Error: Did not redirect to dashboard.html!")

    # Take screenshot of dashboard
    page.screenshot(path="/app/verification/screenshots/dashboard_active.png")
    page.wait_for_timeout(1000)

    print("Step 5: Logging out of session")
    # Click logout button in the sidebar footer
    page.click("#logout-btn")
    page.wait_for_timeout(1500)

    # Should redirect back to signin.html
    print("Current URL after logout:", page.url)
    if "signin.html" in page.url:
         print("Success: Logged out and redirected to signin.html!")
    else:
         print("Error: Logout redirect failed!")

    # Take final screenshot of signin.html
    page.screenshot(path="/app/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    os.makedirs("/app/verification/videos", exist_ok=True)
    os.makedirs("/app/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/app/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print(f"Exception during CUJ execution: {e}")
            page.screenshot(path="/app/verification/screenshots/error.png")
        finally:
            context.close()
            browser.close()
            print("Done verifying.")
