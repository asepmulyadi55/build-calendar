'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { routes } from '@/lib/routes';
import { en, fill } from '@/lib/i18n/en';
import type { SlotValue } from '@/lib/editor/state';
import { resolutionFor } from '@/lib/uploads/resolution';
import {
  countProjectsUsingAsset,
  deleteAssetAction,
  listGalleryAction,
  uploadPhotoAction,
  type GalleryAsset,
} from '@/lib/uploads/actions';

/**
 * Choosing, uploading and fitting a photo (P1-US-304).
 *
 * The gallery is the unit of reuse: a photo uploaded once can go on any sheet of
 * any project, so this panel lists everything the user owns rather than only what
 * this project uses.
 */
export function PhotoPicker({
  slotWidthMm,
  value,
  projectId,
  onChange,
}: {
  slotWidthMm: number;
  value: Extract<SlotValue, { assetId: string }> | undefined;
  projectId: string;
  onChange: (value: SlotValue | undefined) => void;
}) {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void listGalleryAction().then((list) => {
      if (!active) return;
      setAssets(list);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  async function upload(files: FileList | File[]): Promise<void> {
    const list = [...files];
    if (list.length === 0) return;

    setError(null);
    setProgress({ done: 0, total: list.length });

    // One at a time. The server resizes with sharp, and several large photos in
    // flight together is the shape of an out-of-memory on a 1 GB box.
    for (const [index, file] of list.entries()) {
      const form = new FormData();
      form.set('file', file);

      const result = await uploadPhotoAction(form);
      if (!result.ok) {
        setError(result.error ?? en.uploads.errors.storageFailed);
        break;
      }
      setProgress({ done: index + 1, total: list.length });
    }

    setProgress(null);
    setAssets(await listGalleryAction());
  }

  async function remove(asset: GalleryAsset): Promise<void> {
    const used = await countProjectsUsingAsset(asset.id, projectId);
    const warning =
      used > 0
        ? `${fill(used === 1 ? en.uploads.removeInUse : en.uploads.removeInUsePlural, { count: String(used) })}\n\n`
        : '';

    if (!window.confirm(`${en.uploads.removeTitle}\n\n${warning}${en.uploads.removeBody}`)) return;

    const result = await deleteAssetAction(asset.id);
    if (!result.ok) {
      setError(result.error ?? en.uploads.errors.notFound);
      return;
    }

    if (value?.assetId === asset.id) onChange(undefined);
    setAssets(await listGalleryAction());
  }

  const selected = value ? assets.find((asset) => asset.id === value.assetId) : undefined;
  const resolution = selected
    ? resolutionFor({
        // Zooming in uses fewer of the photo's pixels across the same slot, so
        // the effective resolution drops with it.
        photoWidthPx: selected.widthPx / Math.max(value?.zoom ?? 1, 1),
        slotWidthMm,
      })
    : null;

  return (
    <div className="photo-picker">
      {selected && resolution && (
        <div className="card ed-selected">
          <img
            className="ed-selected-img"
            src={routes.asset(selected.id, 'thumb')}
            alt=""
            width={72}
            height={72}
          />
          <div>
            <p className={`small dpi dpi-${resolution.band}`}>
              <span className="dpi-dot" aria-hidden="true" />
              {fill(en.uploads.resolution.label, { dpi: String(resolution.dpi) })}
            </p>
            <p className="small muted">{en.uploads.resolution[resolution.band]}</p>
          </div>
        </div>
      )}

      {selected && (
        <CropControls
          value={value!}
          onChange={(next) => {
            onChange(next);
          }}
        />
      )}

      <div
        className={`dropzone${dragging ? ' on' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          startTransition(() => {
            void upload(event.dataTransfer.files);
          });
        }}
      >
        <b>{en.uploads.dropTitle}</b>
        <p className="small muted">{en.uploads.dropHint}</p>
        <button
          type="button"
          className="btn"
          disabled={pending || progress !== null}
          onClick={() => fileInput.current?.click()}
        >
          {en.uploads.choose}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          hidden
          onChange={(event) => {
            const files = event.target.files;
            if (files) {
              startTransition(() => {
                void upload(files);
              });
            }
            event.target.value = '';
          }}
        />
      </div>

      {progress && (
        <p className="small muted" role="status">
          {fill(en.uploads.uploading, {
            done: String(progress.done),
            total: String(progress.total),
          })}
        </p>
      )}

      {error && (
        <p className="small err" role="alert">
          {error}
        </p>
      )}

      <p className="small muted">{en.uploads.privacyNote}</p>

      <h4>{en.uploads.galleryTitle}</h4>
      {loaded && assets.length === 0 && <p className="small muted">{en.uploads.galleryEmpty}</p>}

      {assets.length > 0 && (
        <>
          <ul className="gallery">
            {assets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className={`gallery-item${value?.assetId === asset.id ? ' on' : ''}`}
                  title={asset.filename ?? en.uploads.use}
                  onClick={() => {
                    onChange({ assetId: asset.id });
                  }}
                >
                  <img src={routes.asset(asset.id, 'thumb')} alt={asset.filename ?? ''} />
                </button>
                <button
                  type="button"
                  className="gallery-remove"
                  aria-label={en.uploads.remove}
                  onClick={() => {
                    void remove(asset);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="small muted">{en.uploads.galleryHint}</p>
        </>
      )}
    </div>
  );
}

/**
 * In-slot fitting. Pan, zoom and 90° rotation only — this is not the drag-and-drop
 * editor, which is Phase 2. "Fit automatically" is the default state, so reset
 * clears the values rather than storing a computed fit.
 */
function CropControls({
  value,
  onChange,
}: {
  value: Extract<SlotValue, { assetId: string }>;
  onChange: (value: SlotValue) => void;
}) {
  const zoom = value.zoom ?? 1;
  const rotation = value.rotation ?? 0;

  return (
    <div className="panel-group crop">
      <h4>{en.uploads.crop.title}</h4>

      <label className="lbl" htmlFor="crop-zoom">
        {en.uploads.crop.zoom}
      </label>
      <input
        id="crop-zoom"
        type="range"
        min={1}
        max={3}
        step={0.05}
        value={zoom}
        onChange={(event) => {
          onChange({ ...value, zoom: Number(event.target.value) });
        }}
      />

      <div className="crop-pan">
        <label className="lbl" htmlFor="crop-x">
          ←→
        </label>
        <input
          id="crop-x"
          type="range"
          min={-1}
          max={1}
          step={0.02}
          value={value.panX ?? 0}
          onChange={(event) => {
            onChange({ ...value, panX: Number(event.target.value) });
          }}
        />
        <label className="lbl" htmlFor="crop-y">
          ↑↓
        </label>
        <input
          id="crop-y"
          type="range"
          min={-1}
          max={1}
          step={0.02}
          value={value.panY ?? 0}
          onChange={(event) => {
            onChange({ ...value, panY: Number(event.target.value) });
          }}
        />
      </div>

      <div className="crop-actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            onChange({ ...value, rotation: (rotation + 90) % 360 });
          }}
        >
          {en.uploads.crop.rotate}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            onChange({ assetId: value.assetId });
          }}
        >
          {en.uploads.crop.reset}
        </button>
      </div>

      <p className="small muted">{en.uploads.crop.hint}</p>
    </div>
  );
}
