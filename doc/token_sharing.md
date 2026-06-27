Prolem: 

In Closet project I dont have authentication. But I need access token to get the data from API.
In website project I have authentication and I store the token in local storage  using pinia.
Is it possible to share the token to closet project?



Yes, it is absolutely possible to share the access token between your Website project and the Closet project!

Since they are two separate Vue projects, they will likely run on different ports locally (e.g., `localhost:5173` and `localhost:5174`) and might be hosted on different domains or subdomains in production. Because of this, they have different "origins" and  **cannot directly read each other's local storage** .

However, there are a few standard ways to solve this, depending on how you plan to link the two projects:

### 1. The Easiest Way: Passing the Token via URL Parameters (Recommended)

If users navigate to the Closet project by clicking a link or button on your Website project, you can simply pass the token in the URL.

**On the Website Project (Sender):** When the user clicks "Open Closet Configurator":


const token = localStorage.getItem('your_pinia_token_key');
// Redirect to the closet app with the token
window.location.href = `http://localhost:5174/closet/type?token=${token}`;


**On the Closet Project (Receiver):** In your `App.vue` or a router guard, you check if there's a token in the URL, save it to the Closet app's local storage/Pinia, and then clean up the URL so the token isn't visible.


import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(() => {
  const token = route.query.token;
  if (token) {
    // 1. Save it to your Closet app's Pinia store or localStorage
    localStorage.setItem('access_token', token);

    // 2. Remove the token from the URL for security so it isn't copied/shared
    const query = { ...route.query };
    delete query.token;
    router.replace({ query });
  }
});



### 2. The Cookie Approach (If on the same root domain)

If your apps will be hosted on subdomains of the same main domain in production (e.g., `www.yourdomain.com` and `closet.yourdomain.com`), you can use **Cookies** instead of Local Storage.

If you set a cookie on the Website project and specify the domain as `.yourdomain.com`, the Closet project will be able to read that exact same cookie automatically.

* **Pros:** Totally seamless, no URL parameters needed.
* **Cons:** Doesn't work locally if they are on different `localhost` ports without some extra configuration, and doesn't work if they are on completely different domains (like `dia-website.com` and `dia-closet.com`).

### 3. Iframe / `postMessage` (Complex)

If the Closet app is embedded *inside* the Website app using an `<iframe>`, the Website can use JavaScript's `window.postMessage` API to securely transmit the token down into the iframe.

---

**Which approach would you prefer?** If the user accesses the Closet app by clicking a link from the Website, **Approach 1 (URL Parameters)** is generally the fastest and most reliable way to get this working right now. I can help you implement this in your code if you'd like!



I have updated the `vite.config.ts` in the Closet project to specifically run on `http://localhost:5175/`.

Now that the ports are fixed, we can implement the URL parameter approach to pass the token.

### How we can implement this:

**1. In the Website Project:** Wherever you have the button or link that opens the Closet Configurator, you would do something like this:

const userToken = localStorage.getItem('token'); // or from Pinia store
window.open(`http://localhost:5175/?token=${userToken}`, '_blank');


**2. In the Closet Project:** I can update your `App.vue` or Router setup to intercept this token from the URL on load, save it, and then clear it from the URL.

Would you like me to go ahead and implement the receiving logic (saving the token) in the Closet project right now? If so, does the Closet project use Pinia or just `localStorage` to store the token once it gets it?
