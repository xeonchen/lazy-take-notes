import { describe, it, expect, vi } from 'vitest';
import { createAggregatedProgressCallback, type HFProgressEvent } from '../../src/adapters/whisper-transformers';

describe('createAggregatedProgressCallback', () => {
  it('aggregates progress across multiple files by total bytes', () => {
    const onProgress = vi.fn();
    const cb = createAggregatedProgressCallback(onProgress);

    // File A: 50% of 100 bytes
    cb({ status: 'progress', file: 'model.onnx', loaded: 50, total: 100 });
    expect(onProgress).toHaveBeenLastCalledWith(50);

    // File B starts: 0% of 200 bytes — overall = 50/(100+200) = 17%
    cb({ status: 'progress', file: 'tokenizer.json', loaded: 0, total: 200 });
    expect(onProgress).toHaveBeenLastCalledWith(17);

    // File A finishes: 100/100, File B still 0/200 → 100/300 = 33%
    cb({ status: 'progress', file: 'model.onnx', loaded: 100, total: 100 });
    expect(onProgress).toHaveBeenLastCalledWith(33);

    // File B finishes: 100/100 + 200/200 = 300/300 = 100%
    cb({ status: 'progress', file: 'tokenizer.json', loaded: 200, total: 200 });
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('ignores non-progress events', () => {
    const onProgress = vi.fn();
    const cb = createAggregatedProgressCallback(onProgress);

    cb({ status: 'initiate', file: 'model.onnx' });
    cb({ status: 'download', file: 'model.onnx' });
    cb({ status: 'done', file: 'model.onnx' });

    expect(onProgress).not.toHaveBeenCalled();
  });

  it('ignores progress events missing file or total', () => {
    const onProgress = vi.fn();
    const cb = createAggregatedProgressCallback(onProgress);

    cb({ status: 'progress', loaded: 50, total: 100 }); // no file
    cb({ status: 'progress', file: 'model.onnx', loaded: 50 }); // no total
    cb({ status: 'progress', file: 'model.onnx', total: 100 }); // no loaded

    expect(onProgress).not.toHaveBeenCalled();
  });

  it('reports 0 when total is zero', () => {
    const onProgress = vi.fn();
    const cb = createAggregatedProgressCallback(onProgress);

    cb({ status: 'progress', file: 'model.onnx', loaded: 0, total: 0 } as HFProgressEvent);
    // total is falsy (0), so the guard `data.total` skips it
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('handles single file correctly', () => {
    const onProgress = vi.fn();
    const cb = createAggregatedProgressCallback(onProgress);

    cb({ status: 'progress', file: 'model.onnx', loaded: 25, total: 100 });
    expect(onProgress).toHaveBeenLastCalledWith(25);

    cb({ status: 'progress', file: 'model.onnx', loaded: 100, total: 100 });
    expect(onProgress).toHaveBeenLastCalledWith(100);

    expect(onProgress).toHaveBeenCalledTimes(2);
  });
});
