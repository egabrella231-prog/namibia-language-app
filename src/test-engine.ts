import { supabase } from "./lib/supabase";

async function runDirectTest() {
  console.log("⚡ Testing Linguistic Engine View...");
  const { data, error } = await supabase
    .from("api_linguistic_engine")
    .select("mutated_word")
    .eq("root_word", "mena")
    .eq("tense", "present")
    .maybeSingle();

  if (error) console.error("❌ Error:", error.message);
  else console.log("✅ Result:", data);
}

runDirectTest();
