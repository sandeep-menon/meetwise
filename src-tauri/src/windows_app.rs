//! Windows features that work differently when the app runs from an MSIX package.
use windows::{
    core::{Result, HSTRING},
    ApplicationModel::{Activation::ActivationKind, AppInstance, StartupTask, StartupTaskState},
    Win32::{Foundation::APPMODEL_ERROR_NO_PACKAGE, Storage::Packaging::Appx::GetCurrentPackageFullName},
};

// Must match the TaskId of the windows.startupTask extension in Package.appxmanifest.
const STARTUP_TASK_ID: &str = "meetwiseStartup";

/// True when running from an MSIX package, which gives the app its own identity.
pub fn is_packaged() -> bool {
    let mut length = 0;
    // With a zero-length buffer this only reports whether a package exists.
    unsafe { GetCurrentPackageFullName(&mut length, None) != APPMODEL_ERROR_NO_PACKAGE }
}

fn startup_task() -> Result<StartupTask> {
    StartupTask::GetAsync(&HSTRING::from(STARTUP_TASK_ID))?.join()
}

fn is_on(state: StartupTaskState) -> bool {
    state == StartupTaskState::Enabled || state == StartupTaskState::EnabledByPolicy
}

/// Whether the package's startup task is on. Users can also change it in Settings > Apps > Startup.
pub fn startup_task_enabled() -> bool {
    startup_task().and_then(|task| task.State()).is_ok_and(is_on)
}

/// Turns the startup task on or off and returns whether it's on afterwards. That can differ from
/// what was asked: once the user turns meetwise off in Settings, only they can turn it back on there.
pub fn set_startup_task(enable: bool) -> Result<bool> {
    let task = startup_task()?;
    let state = if enable {
        task.RequestEnableAsync()?.join()?
    } else {
        task.Disable()?;
        task.State()?
    };
    Ok(is_on(state))
}

/// True when Windows started the app at sign-in through the startup task.
pub fn launched_by_startup_task() -> bool {
    AppInstance::GetActivatedEventArgs()
        .and_then(|args| args.Kind())
        .is_ok_and(|kind| kind == ActivationKind::StartupTask)
}
