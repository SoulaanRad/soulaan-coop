// Fixes Xcode 26 + React Native simulator build compatibility.
//
// Xcode 26 enables C++20 which causes Folly to set FOLLY_HAS_COROUTINES=1,
// then folly/Expected.h tries to include folly/coro/Coroutine.h — a header
// not distributed with React Native's pre-built Folly pod.
//
// Fix: set FOLLY_CFG_NO_COROUTINES=1 to suppress that code path,
// and exclude x86_64 from simulator builds (not present on Apple Silicon).

/** @type {import("@expo/config-plugins").ConfigPlugin} */
const defineConfig = (config) => {
  return require("@expo/config-plugins").withDangerousMod(config, [
    "ios",
    async (config) => {
      const fs = require("fs");
      const path = require("path");
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const marker = "FOLLY_CFG_NO_COROUTINES";
      if (podfile.includes(marker)) return config;

      // Targets that use Folly coroutine headers (via react-native-reanimated / worklets)
      const affectedTargets = ["RNReanimated", "RNWorklets"];
      const targetCondition = affectedTargets.map(t => `target.name == '${t}'`).join(" || ");

      const snippet = [
        "    # Fix Xcode 26: folly/coro/Coroutine.h not distributed in pre-built RN pods.",
        "    # Disabling Folly coroutines prevents folly/Expected.h from including it.",
        "    installer.pods_project.targets.each do |target|",
        `      next unless ${targetCondition}`,
        "      target.build_configurations.each do |config|",
        "        # Use $(inherited) to preserve existing flags from xcconfig files",
        "        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -DFOLLY_CFG_NO_COROUTINES=1'",
        "        config.build_settings['EXCLUDED_ARCHS'] = 'x86_64'",
        "      end",
        "    end",
        "    # Also exclude x86_64 from the main app targets",
        "    installer.aggregate_targets.each do |agg_target|",
        "      agg_target.user_project.native_targets.each do |native_target|",
        "        native_target.build_configurations.each do |config|",
        "          config.build_settings['EXCLUDED_ARCHS'] = 'x86_64'",
        "        end",
        "      end",
        "      agg_target.user_project.save",
        "    end",
      ].join("\n");

      const insertBefore = "    )\n  end\nend";
      const replacement = `    )\n${snippet}\n  end\nend`;

      if (podfile.includes(insertBefore)) {
        podfile = podfile.replace(insertBefore, replacement);
      } else {
        podfile += `\npost_install do |installer|\n${snippet.replace(/^    /gm, "  ")}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = defineConfig;
