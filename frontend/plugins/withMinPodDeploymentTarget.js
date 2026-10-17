// Xcode 27 rejects pod targets whose IPHONEOS_DEPLOYMENT_TARGET is below 15.0
// (older pods like SDWebImage / GoogleSignIn still declare 9.0–13.x).
// This raises every pod target to at least MIN_TARGET in the Podfile's post_install.
const { withPodfile } = require('expo/config-plugins');

const MIN_TARGET = '15.1';
const MARKER = '# [withMinPodDeploymentTarget]';

module.exports = function withMinPodDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    let podfile = cfg.modResults.contents;
    if (podfile.includes(MARKER)) return cfg;

    const snippet = `
    ${MARKER}
    ([installer.pods_project] + installer.generated_projects).uniq.each do |project|
      project.targets.each do |target|
        target.build_configurations.each do |bc|
          current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
          if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN_TARGET}')
            bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'
          end
        end
      end
      project.save
    end
`;
    // Insert at the end of post_install (after react_native_post_install) so nothing overrides it.
    podfile = podfile.replace(
      /(post_install do \|installer\|\n[\s\S]*?\n    \)\n)/,
      `$1${snippet}`
    );
    cfg.modResults.contents = podfile;
    return cfg;
  });
};
