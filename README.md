# Generate a Browser Fingerprint in Node.js

To run this application locally:

1. Clone the project

    ```bash
    git clone https://github.com/kimanikevin254/fingerprintpro-browser-fingerprinting.git
    ```

2. `cd` into the project directory

    ```bash
    cd fingerprintpro-browser-fingerprinting
    ```

3. Install the required dependencies

    ```bash
    npm i
    ```

4. Open `views/register.ejs` and replace `<your-public-api-key>` with your unique public API key which you can get from the [Fingerprint Pro dashboard](https://dashboard.fingerprint.com/) in **App Settings** > **API keys**.

5. Open `server.ejs` and replace `<your-secret-key>` with the correct value which you can obtain from the [Fingerprint Pro dashboard](https://dashboard.fingerprint.com/) in **App Settings** > **API keys** > **CREATE SECRET KEY**. Make sure you select "Secret" for the type of the key.

6. Run the server using the command `node server.js`.
