"""End-to-end Aegis-Net runner.

Usage:
    python scripts/run_pipeline.py                 # run everything on a sample
    python scripts/run_pipeline.py --sample 200    # bigger sample
    python scripts/run_pipeline.py --full          # run on all 10k rows
    python scripts/run_pipeline.py --geo-only      # only compute the desert maps
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from aegis_net.pipeline import (  # noqa: E402
    run_data_pipeline,
    run_full_pipeline,
    run_geo_engine,
    run_swarm,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=80, help="Number of facilities to send through the swarm")
    parser.add_argument("--full", action="store_true", help="Run the swarm on all 10k facilities")
    parser.add_argument("--data-only", action="store_true", help="Only run the bronze/silver/gold pipeline")
    parser.add_argument("--swarm-only", action="store_true", help="Only run the multi-agent swarm")
    parser.add_argument("--geo-only", action="store_true", help="Only compute the E2SFCA access maps")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--capabilities", nargs="*", default=None)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    t0 = time.time()
    if args.data_only:
        run_data_pipeline()
    elif args.swarm_only:
        run_swarm(sample=None if args.full else args.sample, max_workers=args.workers)
    elif args.geo_only:
        run_geo_engine(capabilities=args.capabilities)
    else:
        run_data_pipeline()
        run_swarm(sample=None if args.full else args.sample, max_workers=args.workers)
        run_geo_engine(capabilities=args.capabilities)

    print(f"\nAegis-Net pipeline finished in {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
