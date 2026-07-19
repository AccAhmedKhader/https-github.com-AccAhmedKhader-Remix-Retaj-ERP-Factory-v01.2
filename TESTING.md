# Unified Testing Registry & Verification Workflows (TESTING.md)

This registry details the testing architectures, suites, and performance benchmark suites built to verify the correctness, reliability, and scaling properties of the **Enterprise Storage Foundation**.

---

## 1. Unit & Integration Testing (Vitest)

The unit and integration test suite covers all core storage workflows: encryption, GZIP compression, SHA-256 validation, automatic failover chains, retry policies, and circuit breaker states.

### A. Run the Test Suite
Execute the entire Vitest test suite using:

```bash
npx vitest run
```

### B. Covered Test Categories
1. **Full-Lifecycle File Pipeline**: Tests uploading a raw text payload and downloading it back, verifying that AES-256 encryption, GZIP compression, and SHA-256 calculations match expectations.
2. **Compression Bypass Validation**: Verifies that uncompressible binary formats (e.g., PNG images, PDFs, ZIP archives) bypass GZIP, saving CPU cycles.
3. **HTTP Range-Request Support**: Asserts that download range requests (e.g., slicing bytes `5-15`) return accurate sub-buffers, facilitating pause/resume capabilities.
4. **Resilient Provider Failover**: Mocks a faulty active provider and asserts that the orchestrator transparently handles the failure and writes/reads data through the fallback chain seamlessly.
5. **Circuit Breaker States**: Asserts that 3 consecutive provider failures trip the provider's circuit breaker and bypasses it temporarily, resetting automatically after a 15-second cool-down window.
6. **Telemetry & Metrics**: Asserts that uploads/downloads write appropriate counters and throughput records to the Prometheus registry.

---

## 2. High-Scale Performance Benchmarking

To verify container performance under heavy, enterprise-scale storage volumes (up to and exceeding 10GB), we developed a custom, high-speed benchmark runner.

### A. Run the Benchmarks
To execute the automated benchmarks and performance profiles:

```bash
npx tsx src/core/tests/performance-benchmark.ts
```

### B. High-Speed, Zero-RAM Streaming Architecture
Testing 1GB or 10GB file transfers on standard virtual machines or container environments often risks running out of disk space or blowing up container memory.

Our custom performance benchmark solves this via **on-the-fly virtual streams**:
* **`DummyReadable` stream**: Generates chunks of zero-bytes (`Buffer.alloc(chunkSize, 0)`) completely in memory dynamically on-demand, consuming **exactly zero disk storage and exactly zero RAM buffering** even for 10GB payloads.
* **`DevNull` writable stream**: Consumes the downloaded stream chunk-by-chunk and throws them away, enabling raw network and decrypt/decompress throughput profiling.
* **Heap Memory Metrics**: Automatically prints before-and-after process memory metrics (`process.memoryUsage().heapUsed`), proving that our streaming pipeline maintains a completely flat, stable memory profile during massive file transfers.

### C. Example Output
The script produces a scannable Markdown summary table detailing:
* Benchmark file sizes (10MB, 100MB, 1GB, 10GB).
* Upload speed (MB/s).
* Upload memory delta (MB).
* Download speed (MB/s).
* Download memory delta (MB).
* Concurrent upload throughput.
