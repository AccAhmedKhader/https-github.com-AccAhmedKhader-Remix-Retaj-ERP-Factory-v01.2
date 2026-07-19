import { Readable } from "stream";
import { StorageService } from "../storage/StorageService";

// Custom readable stream to generate zero-RAM data dynamically
class DummyReadable extends Readable {
  private bytesRemaining: number;
  private chunkSize: number;

  constructor(totalBytes: number, chunkSize = 1024 * 1024) {
    super();
    this.bytesRemaining = totalBytes;
    this.chunkSize = chunkSize;
  }

  _read() {
    if (this.bytesRemaining <= 0) {
      this.push(null);
      return;
    }
    const size = Math.min(this.bytesRemaining, this.chunkSize);
    const chunk = Buffer.alloc(size, 0);
    this.bytesRemaining -= size;
    this.push(chunk);
  }
}

// Dev Null stream to consume download streams without writing to disk
import { Writable } from "stream";
class DevNull extends Writable {
  _write(chunk: any, encoding: string, callback: Function) {
    callback();
  }
}

function getMemoryUsageMB(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

async function runBenchmark(label: string, sizeBytes: number) {
  const sizeMB = sizeBytes / 1024 / 1024;
  console.log(`\n================================================================`);
  console.log(`BENCHMARK: ${label} (${sizeMB.toFixed(1)} MB)`);
  console.log(`================================================================`);

  const initialMemory = getMemoryUsageMB();
  console.log(`[Prep] Heap Memory: ${initialMemory} MB`);

  // 1. Upload Stream Benchmark
  console.log(`[Upload] Starting zero-RAM streaming upload...`);
  const uploadStartTime = Date.now();
  const dummyStream = new DummyReadable(sizeBytes);
  const uploadRes = await StorageService.uploadStream(
    "TEN-BENCH",
    "DOC-BENCH",
    "v1.0",
    `bench_${label}.dat`,
    dummyStream
  );
  const uploadDurationMs = Date.now() - uploadStartTime;
  const uploadMemory = getMemoryUsageMB();
  const uploadSpeedMBs = sizeMB / (uploadDurationMs / 1000);

  console.log(`[Upload] Completed in ${uploadDurationMs}ms`);
  console.log(`[Upload] Average Speed: ${uploadSpeedMBs.toFixed(2)} MB/s`);
  console.log(`[Upload] Peak Heap Memory: ${uploadMemory} MB (Delta: ${uploadMemory - initialMemory} MB)`);

  // 2. Download Stream Benchmark
  console.log(`[Download] Starting zero-RAM streaming download & decrypt & decompress...`);
  const downloadStartTime = Date.now();
  const downloadStream = await StorageService.downloadStream(uploadRes.storageKey, "TEN-BENCH");
  
  await new Promise<void>((resolve, reject) => {
    const devNull = new DevNull();
    downloadStream.pipe(devNull);
    downloadStream.on("end", resolve);
    downloadStream.on("error", reject);
  });

  const downloadDurationMs = Date.now() - downloadStartTime;
  const downloadMemory = getMemoryUsageMB();
  const downloadSpeedMBs = sizeMB / (downloadDurationMs / 1000);

  console.log(`[Download] Completed in ${downloadDurationMs}ms`);
  console.log(`[Download] Average Speed: ${downloadSpeedMBs.toFixed(2)} MB/s`);
  console.log(`[Download] Peak Heap Memory: ${downloadMemory} MB (Delta: ${downloadMemory - uploadMemory} MB)`);

  // 3. Clean up
  console.log(`[Cleanup] Deleting benchmark file from storage...`);
  await StorageService.deleteFile(uploadRes.storageKey, "TEN-BENCH");

  return {
    sizeMB,
    uploadTimeMs: uploadDurationMs,
    uploadSpeed: uploadSpeedMBs,
    uploadMemoryDelta: uploadMemory - initialMemory,
    downloadTimeMs: downloadDurationMs,
    downloadSpeed: downloadSpeedMBs,
    downloadMemoryDelta: downloadMemory - uploadMemory,
  };
}

async function runConcurrentBenchmark(concurrency: number, totalSizeBytes: number) {
  console.log(`\n================================================================`);
  console.log(`CONCURRENT BENCHMARK: ${concurrency} operations x ${(totalSizeBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`================================================================`);

  const initialMemory = getMemoryUsageMB();
  const start = Date.now();

  const promises = Array.from({ length: concurrency }).map(async (_, idx) => {
    const stream = new DummyReadable(totalSizeBytes);
    const res = await StorageService.uploadStream("TEN-BENCH", `DOC-CONC-${idx}`, "v1.0", "file.dat", stream);
    await StorageService.deleteFile(res.storageKey, "TEN-BENCH");
  });

  await Promise.all(promises);
  const duration = Date.now() - start;
  const finalMemory = getMemoryUsageMB();

  console.log(`[Concurrent] All operations finished in ${duration}ms`);
  console.log(`[Concurrent] Peak Heap Memory Delta: ${finalMemory - initialMemory} MB`);
}

async function main() {
  console.log("Enterprise Storage Foundation - Full-Scale Performance Verification");
  
  // Warmup
  console.log("Warming up engine...");
  await runBenchmark("WARMUP", 5 * 1024 * 1024);

  // Benchmarks
  const results10MB = await runBenchmark("10MB_FILE", 10 * 1024 * 1024);
  const results100MB = await runBenchmark("100MB_FILE", 100 * 1024 * 1024);
  
  // 1GB (1000MB) Simulated Streaming Benchmark
  const results1GB = await runBenchmark("1GB_SIMULATED", 1000 * 1024 * 1024);

  // 10GB (10000MB) Large File Pipeline Benchmark (Simulated zero-RAM streaming)
  const results10GB = await runBenchmark("10GB_SIMULATED", 10000 * 1024 * 1024);

  // Concurrent streams
  await runConcurrentBenchmark(5, 10 * 1024 * 1024);

  console.log("\n================================================================");
  console.log("SUMMARY REPORT (MARKDOWN FORMAT)");
  console.log("================================================================");
  console.log("| Benchmark File Size | Upload Speed | Upload Mem Delta | Download Speed | Download Mem Delta |");
  console.log("|---------------------|--------------|------------------|----------------|--------------------|");
  console.log(`| 10 MB               | ${results10MB.uploadSpeed.toFixed(1)} MB/s | ${results10MB.uploadMemoryDelta} MB | ${results10MB.downloadSpeed.toFixed(1)} MB/s | ${results10MB.downloadMemoryDelta} MB |`);
  console.log(`| 100 MB              | ${results100MB.uploadSpeed.toFixed(1)} MB/s | ${results100MB.uploadMemoryDelta} MB | ${results100MB.downloadSpeed.toFixed(1)} MB/s | ${results100MB.downloadMemoryDelta} MB |`);
  console.log(`| 1 GB (Streaming)    | ${results1GB.uploadSpeed.toFixed(1)} MB/s | ${results1GB.uploadMemoryDelta} MB | ${results1GB.downloadSpeed.toFixed(1)} MB/s | ${results1GB.downloadMemoryDelta} MB |`);
  console.log(`| 10 GB (Streaming)   | ${results10GB.uploadSpeed.toFixed(1)} MB/s | ${results10GB.uploadMemoryDelta} MB | ${results10GB.downloadSpeed.toFixed(1)} MB/s | ${results10GB.downloadMemoryDelta} MB |`);
}

main().catch(err => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
