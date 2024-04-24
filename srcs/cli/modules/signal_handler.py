import sys
import signal
import time

def signal_handler(sig, frame):
    print("\nYou have pressed CTRL+C")
    print("Goodbye. See you around!")
    time.sleep(2)
    sys.exit(0)
