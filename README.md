## MedVerify: Medicine Verification System

A progressive web app that lets pharmacists and healthcare workers check whether a medicine is genuine, counterfeit or expired in seconds, by typing its ID or scanning the code on the pack.

![MedVerify showing counterfeit, genuine and expired results](docs/screenshots.png)

Counterfeit medicine is a serious problem in Nigeria, and a pharmacist often has no quick way of knowing whether the pack in their hand is real. For my dissertation I set out to change that, and built a medicine verification system in Bubble.io with QR scanning, separate access for regulators, pharmacists and patients, inventory management and a regulator dashboard. In usability testing, every participant completed every task. Since then I have rebuilt the core of it in code so anyone can try it: type in a medicine ID or scan a code, and the app tells you straight away whether the medicine is genuine, counterfeit or expired, even with no internet connection.

**Try it**

Open the live demo and enter `MED001` (genuine), `MED003` (counterfeit), `MED011` (expired) or `FAKE999` (not recognised). To test the scanner, open [test-codes/test-codes.png](test-codes/test-codes.png) on another screen and scan any code.



