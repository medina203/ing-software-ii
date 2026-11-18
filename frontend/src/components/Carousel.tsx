import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { assetUrl } from '../lib/assets';
import { cn } from '../lib/cn';
import type { ArticuloCarrusel } from '../lib/settings';

const INTERVAL_MS = 6000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Carrusel de artículos del panel. Avanza solo cada 6 s, se pausa al pasar el
 * mouse o enfocarlo, admite flechas del teclado y deslizar en el celular, y no
 * se mueve solo si el usuario prefiere reducir el movimiento.
 */
export function Carousel({ articles }: { articles: ArticuloCarrusel[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const touchStart = useRef<number | null>(null);
  const count = articles.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (paused || hovered || count < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % count),
      INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, hovered, count]);

  if (count === 0) return null;

  return (
    <section
      className="theme-fixed relative h-full min-h-[18rem] overflow-hidden rounded-3xl bg-ink-900 text-white shadow-xl"
      aria-roledescription="carrusel"
      aria-label="Artículos destacados"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(index + 1);
        if (event.key === 'ArrowLeft') go(index - 1);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
        if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      {articles.map((article, i) => (
        <article
          key={`${article.titulo}-${i}`}
          role="group"
          aria-roledescription="diapositiva"
          aria-label={`${i + 1} de ${count}: ${article.titulo}`}
          aria-hidden={i !== index}
          data-testid="carousel-slide"
          data-active={i === index}
          className={cn(
            'absolute inset-0 transition-all duration-700 ease-out',
            i === index
              ? 'translate-x-0 opacity-100'
              : 'pointer-events-none translate-x-6 opacity-0',
          )}
        >
          {article.imagenUrl && (
            <img
              src={assetUrl(article.imagenUrl)}
              alt=""
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-transform duration-[6000ms] ease-linear',
                i === index && !paused && !hovered ? 'scale-105' : 'scale-100',
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/80 to-transparent" />
          <div className="relative flex h-full max-w-md flex-col justify-center px-6 pb-16 pt-6 sm:px-8 sm:pb-14 sm:pt-8">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-brand-400">
              Destacado
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-[1.7rem]">
              {article.titulo}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{article.texto}</p>
            {article.enlace && (
              <Link
                to={article.enlace}
                tabIndex={i === index ? 0 : -1}
                className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-brand-400"
              >
                Ver más <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </article>
      ))}

      {count > 1 && (
        <div className="absolute bottom-4 left-6 right-4 flex items-center justify-between sm:left-8">
          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label="Elegir artículo"
          >
            {articles.map((article, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Ir al artículo ${i + 1}: ${article.titulo}`}
                onClick={() => go(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-8 bg-brand-400' : 'w-3 bg-white/30 hover:bg-white/60',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? 'Reanudar carrusel' : 'Pausar carrusel'}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            >
              {paused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Artículo anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Artículo siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
