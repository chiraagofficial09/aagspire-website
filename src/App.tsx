import { useState } from 'react';
import CursorEffect from './components/CursorEffect';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Process from './components/Process';
import Testimonials from './components/Testimonials';
import About from './components/About';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  const [ignited, setIgnited] = useState(false);
  const [isWorkOpen, setIsWorkOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleOpenWork = () => {
    if (!ignited) setIgnited(true);
    setIsContactOpen(false);
    setIsWorkOpen(true);
  };

  const handleCloseWork = () => {
    setIsWorkOpen(false);
  };

  const handleOpenContact = () => {
    if (!ignited) setIgnited(true);
    setIsWorkOpen(false);
    setIsContactOpen(true);
  };

  const handleCloseContact = () => {
    setIsContactOpen(false);
  };

  return (
    <div
      className={`relative min-h-screen bg-obsidian text-white noise-overlay ${
        !ignited ? 'overflow-hidden max-h-screen' : 'overflow-x-hidden'
      }`}
    >
      <CursorEffect />
      <Navbar
        visible={ignited}
        isWorkOpen={isWorkOpen}
        onOpenWork={handleOpenWork}
        onCloseWork={handleCloseWork}
        onOpenContact={handleOpenContact}
      />

      <main className="relative z-10">
        <Hero
          ignited={ignited}
          onIgnite={() => setIgnited(true)}
          onOpenWork={handleOpenWork}
          onOpenContact={handleOpenContact}
        />
        {ignited && (
          <div className="transition-opacity duration-1000 opacity-100">
            <Services
              isWorkOpen={isWorkOpen}
              onCloseWork={handleCloseWork}
            />
            <Process />
            <Testimonials />
            <About />
            <CTA
              isContactOpen={isContactOpen}
              onOpenContact={handleOpenContact}
              onCloseContact={handleCloseContact}
              onOpenWork={handleOpenWork}
            />
          </div>
        )}
      </main>
      {ignited && <Footer />}
    </div>
  );
}

export default App;

