import { useState } from 'react';
import CursorEffect from './components/CursorEffect';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Portfolio from './components/Portfolio';
import Process from './components/Process';
import Testimonials from './components/Testimonials';
import About from './components/About';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  const [ignited, setIgnited] = useState(false);

  return (
    <div
      className={`relative min-h-screen bg-obsidian text-white noise-overlay ${
        !ignited ? 'overflow-hidden max-h-screen' : 'overflow-x-hidden'
      }`}
    >
      <CursorEffect />
      <Navbar visible={ignited} />

      <main className="relative z-10">
        <Hero ignited={ignited} onIgnite={() => setIgnited(true)} />
        {ignited && (
          <div className="transition-opacity duration-1000 opacity-100">
            <Services />
            <Portfolio />
            <Process />
            <Testimonials />
            <About />
            <CTA />
          </div>
        )}
      </main>
      {ignited && <Footer />}
    </div>
  );
}

export default App;

