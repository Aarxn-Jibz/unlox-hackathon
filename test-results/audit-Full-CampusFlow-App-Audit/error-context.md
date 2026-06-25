# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit.spec.ts >> Full CampusFlow App Audit
- Location: e2e/audit.spec.ts:24:1

# Error details

```
Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e6]:
    - generic [ref=e7]:
      - heading "CampusFlow" [level=1] [ref=e8]
      - paragraph [ref=e9]: Smart Academic Platform & Automations
    - generic [ref=e10]:
      - button "Log In" [ref=e11]
      - button "Sign Up" [ref=e12]
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: Email Address
        - generic [ref=e16]:
          - generic:
            - img
          - textbox "Enter your college email" [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]: Password
        - generic [ref=e20]:
          - generic:
            - img
          - textbox "Enter your password" [ref=e21]
      - button "Login" [ref=e22]:
        - generic [ref=e23]: Login
  - generic [ref=e25]: Press d anywhere to toggle theme
```