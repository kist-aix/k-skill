import argparse
import importlib.util
import pathlib
import unittest

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "myrealtrip-search" / "scripts" / "myrealtrip_mcp.py"
spec = importlib.util.spec_from_file_location("myrealtrip_mcp", MODULE_PATH)
myrealtrip_mcp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(myrealtrip_mcp)


class MyRealTripMcpWrapperTests(unittest.TestCase):
    def test_parse_json_object_requires_object(self):
        self.assertEqual(myrealtrip_mcp.parse_json_object('{"query":"제주"}', arg_name="--json"), {"query": "제주"})
        with self.assertRaises(argparse.ArgumentTypeError):
            myrealtrip_mcp.parse_json_object('["not", "object"]', arg_name="--json")

    def test_parse_kv_pairs_json_decodes_values(self):
        parsed = myrealtrip_mcp.parse_kv_pairs(["query=오사카", "perPage=5", "filters={\"theme\":\"ticket\"}"])
        self.assertEqual(parsed["query"], "오사카")
        self.assertEqual(parsed["perPage"], 5)
        self.assertEqual(parsed["filters"], {"theme": "ticket"})

    def test_parse_args_merges_json_and_kv_arguments(self):
        args = myrealtrip_mcp.parse_args([
            "call",
            "searchTnas",
            "--json",
            '{"query":"오사카","perPage":3}',
            "--arg",
            "perPage=5",
        ])
        tool_args = dict(args.json_args or {})
        tool_args.update(myrealtrip_mcp.parse_kv_pairs(args.kv_args))
        self.assertEqual(args.command, "call")
        self.assertEqual(args.tool, "searchTnas")
        self.assertEqual(tool_args, {"query": "오사카", "perPage": 5})


if __name__ == "__main__":
    unittest.main()
