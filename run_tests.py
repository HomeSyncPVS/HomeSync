import pytest
import sys
import os

# Define a temporary file to store pytest output
output_file = "pytest_output.txt"

try:
    # Run pytest and redirect its output to the temporary file
    with open(output_file, "w") as f:
        # Store the original stdout
        original_stdout = sys.stdout
        # Redirect stdout to the file
        sys.stdout = f
        # Run pytest
        pytest.main(['d:\\HomeSync\\HomeSync\\tests\\test_resident_module.py'])
finally:
    # Restore original stdout
    sys.stdout = original_stdout
    # Print the content of the output file to the console
    if os.path.exists(output_file):
        with open(output_file, "r") as f:
            print(f.read())
        os.remove(output_file) # Clean up the temporary file