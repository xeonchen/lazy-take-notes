interface Props {
  onDismiss: () => void;
  onNeverShow: () => void;
}

export function ConsentNotice({ onDismiss, onNeverShow }: Props) {
  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal consent-notice" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Recording Notice</span>
        </div>
        <div className="modal-body">
          <p>This session will <strong>record audio</strong> and generate a transcript.</p>
          <ul style={{ marginTop: '0.75rem', paddingLeft: '1.5rem' }}>
            <li><strong>Inform all participants</strong> that recording is active.</li>
            <li>Recording without consent may violate local laws.</li>
            <li>You are responsible for compliance.</li>
          </ul>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onNeverShow}>Don't show again</button>
          <button className="btn btn-primary" onClick={onDismiss}>I understand</button>
        </div>
      </div>
    </div>
  );
}
