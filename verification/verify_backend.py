import sys
from playwright.sync_api import sync_playwright

def run_backend_tests():
    print("Starting Playwright for Backend Verification Tests...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen to page logs
        page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

        try:
            print("Navigating to test_backend.html...")
            import time
            page.goto(f"http://localhost:8000/test_backend.html?cb={int(time.time())}")

            # Wait for indicator to be attached (even if hidden or failed)
            page.wait_for_selector("#test-status-indicator", state="attached", timeout=10000)

            # Print the text content of all results
            results = page.locator("#results").inner_text()
            print("\n--- TEST CASE RESULTS ---")
            print(results)
            print("-------------------------\n")

            # Fetch the test result status
            indicator = page.locator("#test-status-indicator")
            status = indicator.get_attribute("data-status")
            summary = page.locator("#summary").inner_text()

            print("==================================================")
            print(f"Test Summary: {summary}")
            print(f"Backend Status Indicator: {status}")
            print("==================================================")

            # Take a screenshot of results for visual proof
            page.screenshot(path="/app/verification/screenshots/backend_tests_result.png")

            if status == "SUCCESS":
                return True
            else:
                return False

        except Exception as e:
            print(f"Error during backend tests: {e}")
            page.screenshot(path="/app/verification/screenshots/backend_test_error.png")
            return False
        finally:
            browser.close()

if __name__ == "__main__":
    success = run_backend_tests()
    if not success:
        sys.exit(1)
    else:
        sys.exit(0)
