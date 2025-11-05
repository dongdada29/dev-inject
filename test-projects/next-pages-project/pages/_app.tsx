import type { AppProps } from 'next/app'
import '../styles/globals.css'


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  
  {/* DEV-INJECT-END */}


  {/* DEV-INJECT-START */}
  useEffect(() => {
      if (typeof window !== 'undefined') {
        (function() {
      const remote = "https://testagent.xspaceagi.com/sdk/dev-monitor.js";
      const separator = remote.includes('?') ? '&' : '?';
      const script = document.createElement('script');
      script.src = remote + separator + 't=' + Date.now();
      script.dataset.id = 'dev-inject-monitor-script';
      script.defer = true;
      // 防止重复注入
      if (!document.querySelector('[data-id="dev-inject-monitor-script"]')) {
        document.head.appendChild(script);
      }
    })();
      }
    }, []);
  {/* DEV-INJECT-END */}

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

