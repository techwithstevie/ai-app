const { withGradleProperties } = require("expo/config-plugins");

module.exports = function withAndroidPackagingFix(config) {
    return withGradleProperties(config, (config) => {
        const key = "android.packagingOptions.excludes";
        const value = "META-INF/versions/9/OSGI-INF/MANIFEST.MF";

        const existing = config.modResults.find((item) => item.type === "property" && item.key === key);

        if (existing) {
            const parts = String(existing.value || "")
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);

            if (!parts.includes(value)) {
                existing.value = [...parts, value].join(",");
            }
        } else {
            config.modResults.push({
                type: "property",
                key,
                value,
            });
        }

        return config;
    });
};