import { useState, useEffect, useRef, useCallback } from 'react';
import type { GlobalSettings, MatchingMode } from '@jirehs-flashcards/shared-types';
import { useSettings } from '../hooks/useSettings';
import { useFileWatcher } from '../hooks/useFileWatcher';
import { useToast } from '../hooks/useToast';
import { WatchedDirectoriesSection } from '../components/Settings/WatchedDirectoriesSection';
import { ToastContainer } from '../components/Notifications/Toast';
import { Undo } from 'iconoir-react';

const DEFAULTS: GlobalSettings = {
  algorithm: 'sm2',
  rating_scale: '4point',
  matching_mode: 'fuzzy',
  fuzzy_threshold: 0.8,
  new_cards_per_day: 20,
  reviews_per_day: 200,
  daily_reset_hour: 0,
};

const SECTION_KEYS: Record<string, (keyof GlobalSettings)[]> = {
  algorithm: ['algorithm'],
  study: ['rating_scale'],
  matching: ['matching_mode', 'fuzzy_threshold'],
  limits: ['new_cards_per_day', 'reviews_per_day', 'daily_reset_hour'],
};

function sectionDiffers(
  data: GlobalSettings,
  section: string
): boolean {
  const keys = SECTION_KEYS[section];
  if (!keys) return false;
  return keys.some((k) => data[k] !== DEFAULTS[k]);
}

function anyDiffers(data: GlobalSettings): boolean {
  return Object.keys(SECTION_KEYS).some((s) => sectionDiffers(data, s));
}

function resetSection(data: GlobalSettings, section: string): GlobalSettings {
  const keys = SECTION_KEYS[section];
  if (!keys) return data;
  const defaults = Object.fromEntries(keys.map((k) => [k, DEFAULTS[k]]));
  return { ...data, ...defaults };
}

export function Settings() {
  const { settings, isLoading, save } = useSettings();
  const {
    watchedDirectories,
    startWatching,
    stopWatching,
    refreshAll,
    isStartingWatch,
    isStoppingWatch,
    isRefreshing,
    startError,
    stopError,
    refreshError,
  } = useFileWatcher();
  const { toasts, show, dismiss, remove, autoDismissMs } = useToast(2000);
  const [formData, setFormData] = useState<GlobalSettings | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  const debouncedSave = useCallback(
    (data: GlobalSettings) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save(data, {
          onSuccess: () => show('Settings saved', 'success'),
          onError: () => show('Failed to save settings', 'warning'),
        });
      }, 500);
    },
    [save, show]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (isLoading || !formData) {
    return (
      <div className="settings-page">
        <h1>Settings</h1>
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  const handleChange = <K extends keyof GlobalSettings>(
    key: K,
    value: GlobalSettings[K]
  ) => {
    const next = { ...formData, [key]: value };
    setFormData(next);
    debouncedSave(next);
  };

  const handleResetSection = (section: string) => {
    const next = resetSection(formData, section);
    setFormData(next);
    debouncedSave(next);
  };

  const handleResetAll = () => {
    setFormData({ ...DEFAULTS });
    debouncedSave({ ...DEFAULTS });
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p className="settings-subtitle">
          Configure your study preferences. These apply globally and can be overridden per deck.
        </p>
      </div>

      <div className="settings-form">
        {/* Algorithm Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>Spaced Repetition</h2>
              <p className="settings-section-desc">
                Choose the scheduling algorithm that determines when cards reappear.
                SM-2 is battle-tested and predictable. FSRS adapts to your personal memory patterns.
              </p>
            </div>
            {sectionDiffers(formData, 'algorithm') && (
              <button
                type="button"
                className="reset-link"
                onClick={() => handleResetSection('algorithm')}
              >
                <Undo /> Reset
              </button>
            )}
          </div>
          <div className="form-group">
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-option ${formData.algorithm === 'sm2' ? 'active' : ''}`}
                onClick={() => handleChange('algorithm', 'sm2')}
              >
                <span className="toggle-label">SM-2</span>
                <span className="toggle-desc">Classic</span>
              </button>
              <button
                type="button"
                className={`toggle-option ${formData.algorithm === 'fsrs' ? 'active' : ''}`}
                onClick={() => handleChange('algorithm', 'fsrs')}
              >
                <span className="toggle-label">FSRS</span>
                <span className="toggle-desc">Adaptive</span>
              </button>
            </div>
          </div>
        </section>

        {/* Study Mode Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>Rating Scale</h2>
              <p className="settings-section-desc">
                How you grade yourself after reviewing a card. Four-point gives finer control
                over scheduling; two-point is simpler and faster.
              </p>
            </div>
            {sectionDiffers(formData, 'study') && (
              <button
                type="button"
                className="reset-link"
                onClick={() => handleResetSection('study')}
              >
                <Undo /> Reset
              </button>
            )}
          </div>
          <div className="form-group">
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-option ${formData.rating_scale === '4point' ? 'active' : ''}`}
                onClick={() => handleChange('rating_scale', '4point')}
              >
                <span className="toggle-label">4-Point</span>
                <span className="toggle-desc">Again / Hard / Good / Easy</span>
              </button>
              <button
                type="button"
                className={`toggle-option ${formData.rating_scale === '2point' ? 'active' : ''}`}
                onClick={() => handleChange('rating_scale', '2point')}
              >
                <span className="toggle-label">2-Point</span>
                <span className="toggle-desc">Wrong / Correct</span>
              </button>
            </div>
          </div>
        </section>

        {/* Answer Matching Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>Answer Matching</h2>
              <p className="settings-section-desc">
                Controls how typed answers are compared to the correct answer.
                Fuzzy matching forgives minor typos; exact match requires precision.
              </p>
            </div>
            {sectionDiffers(formData, 'matching') && (
              <button
                type="button"
                className="reset-link"
                onClick={() => handleResetSection('matching')}
              >
                <Undo /> Reset
              </button>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Matching Mode</label>
            <div className="toggle-group toggle-group-tri">
              <button
                type="button"
                className={`toggle-option ${formData.matching_mode === 'exact' ? 'active' : ''}`}
                onClick={() => handleChange('matching_mode', 'exact' as MatchingMode)}
              >
                <span className="toggle-label">Exact</span>
              </button>
              <button
                type="button"
                className={`toggle-option ${formData.matching_mode === 'case_insensitive' ? 'active' : ''}`}
                onClick={() => handleChange('matching_mode', 'case_insensitive' as MatchingMode)}
              >
                <span className="toggle-label">Case Insensitive</span>
              </button>
              <button
                type="button"
                className={`toggle-option ${formData.matching_mode === 'fuzzy' ? 'active' : ''}`}
                onClick={() => handleChange('matching_mode', 'fuzzy' as MatchingMode)}
              >
                <span className="toggle-label">Fuzzy</span>
              </button>
            </div>
          </div>

          {formData.matching_mode === 'fuzzy' && (
            <div className="form-group slider-group">
              <div className="slider-header">
                <label className="form-label">Similarity Threshold</label>
                <span className="slider-value">{Math.round(formData.fuzzy_threshold * 100)}%</span>
              </div>
              <input
                type="range"
                className="form-range"
                min="0.5"
                max="1"
                step="0.05"
                value={formData.fuzzy_threshold}
                onChange={(e) => handleChange('fuzzy_threshold', parseFloat(e.target.value))}
              />
              <div className="slider-labels">
                <span>Lenient</span>
                <span>Strict</span>
              </div>
            </div>
          )}
        </section>

        {/* Daily Limits Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>Daily Limits</h2>
              <p className="settings-section-desc">
                Cap how many cards you see each day to prevent burnout.
                New cards introduce fresh material; reviews reinforce what you have learned.
              </p>
            </div>
            {sectionDiffers(formData, 'limits') && (
              <button
                type="button"
                className="reset-link"
                onClick={() => handleResetSection('limits')}
              >
                <Undo /> Reset
              </button>
            )}
          </div>

          <div className="limits-grid">
            <div className="form-group">
              <label className="form-label">New Cards</label>
              <div className="number-input-wrap">
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="999"
                  value={formData.new_cards_per_day}
                  onChange={(e) =>
                    handleChange('new_cards_per_day', parseInt(e.target.value) || 0)
                  }
                />
                <span className="number-unit">/ day</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reviews</label>
              <div className="number-input-wrap">
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="9999"
                  value={formData.reviews_per_day}
                  onChange={(e) =>
                    handleChange('reviews_per_day', parseInt(e.target.value) || 0)
                  }
                />
                <span className="number-unit">/ day</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Day Resets At</label>
            <select
              className="form-select"
              value={formData.daily_reset_hour}
              onChange={(e) => handleChange('daily_reset_hour', parseInt(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0
                    ? '12:00 AM (Midnight)'
                    : i < 12
                      ? `${i}:00 AM`
                      : i === 12
                        ? '12:00 PM (Noon)'
                        : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Watched Directories */}
        <WatchedDirectoriesSection
          watchedDirectories={watchedDirectories}
          onAddDirectory={startWatching}
          onRemoveDirectory={stopWatching}
          onRefreshAll={refreshAll}
          isAddPending={isStartingWatch}
          isRemovePending={isStoppingWatch}
          isRefreshing={isRefreshing}
          error={startError || stopError || refreshError}
        />

        {/* Reset All */}
        {anyDiffers(formData) && (
          <div className="settings-footer">
            <button
              type="button"
              className="reset-all-button"
              onClick={handleResetAll}
            >
              <Undo /> Reset all to defaults
            </button>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} onRemove={remove} autoDismissMs={autoDismissMs} />
    </div>
  );
}
